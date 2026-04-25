import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useRoute, useLocation } from 'wouter';
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom';
import TextareaAutosize from 'react-textarea-autosize';
import {
  IconArrowUp,
  IconMicrophone,
  IconPlayerPause,
  IconPlayerStop,
  IconPlayerPlay,
  IconPlus,
  IconArrowLeft,
  IconVolume,
} from '@tabler/icons-react';
import { agentChat, api, platform } from '../api';
import type { Conversation } from '../api';
import { Monogram } from '../components/Monogram';
import { Button } from '../components/Button';
import { CitationChip } from '../components/CitationChip';
import { useSession } from '../store';
import type { CitationChip as CitationChipData } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  citations?: CitationChipData[];
  toolStatusLines?: Array<{ name: string; result?: string }>;
  streaming?: boolean;
  isFresh?: boolean;
}

const STARTER_PROMPTS = [
  'Help me sharpen my niche.',
  'Draft a T1 email for a specific partner.',
  'Walk me through a coffee date.',
  'Review this sales page copy I wrote.',
  'What does Travis say about hand-raisers?',
];

export function ChatPage() {
  const [matchesGlobal, globalParams] = useRoute<{ threadId?: string }>('/chat/:threadId?');
  const [matchesProject, projectParams] = useRoute<{ projectId: string; threadId?: string }>(
    '/chat/project/:projectId/:threadId?'
  );
  const [, navigate] = useLocation();

  const projectId = matchesProject ? projectParams?.projectId : undefined;
  const threadIdFromUrl = (matchesProject ? projectParams?.threadId : globalParams?.threadId) ?? undefined;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const abortRef = useRef<{ abort: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listConversations({ projectId: projectId ?? null })
      .then((res) => {
        if (cancelled) return;
        setConversations(res.conversations);
        if (threadIdFromUrl) {
          setActiveThreadId(threadIdFromUrl);
        }
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, [projectId, threadIdFromUrl]);

  useEffect(() => {
    // When the active thread changes, load its history
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    const convo = conversations.find((c) => c.id === activeThreadId);
    if (!convo) return;
    let cancelled = false;
    agentChat
      .getThread(convo.agentThreadId)
      .then((thread) => {
        if (cancelled) return;
        // Convert platform thread messages to our ChatMessage shape
        const msgs: ChatMessage[] =
          thread.messages?.map((m: any, i: number) => ({
            id: m.id ?? `msg-${i}`,
            role: m.role as 'user' | 'assistant',
            content: (m.content ?? '') as string,
            citations: extractCitationsFromMessage(m),
          })) ?? [];
        // Guard: if the server thread is empty but we have local optimistic
        // messages, keep ours. This protects the just-created-thread case
        // where this effect fires while sendMessage is still in flight —
        // without this guard, getThread resolves first and wipes the
        // optimistic user/assistant pair, leaving streaming text with
        // nothing to append to.
        setMessages((prev) => {
          if (msgs.length === 0 && prev.length > 0) return prev;
          return msgs;
        });
      })
      .catch((err) => {
        console.error('Failed to load thread:', err);
      });
    return () => {
      cancelled = true;
    };
    // Only re-run when the active thread itself changes. We deliberately do
    // NOT include conversations.length — adding a new conversation row (e.g.
    // from sendMessage) would re-fire this effect mid-send and re-trigger the
    // race we're guarding against above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThreadId]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || sending) return;
    setSending(true);
    // Clear the input immediately so the user knows their send was accepted —
    // don't wait for the round-trip. The optimistic message also goes in below.
    setInput('');

    try {
      // Create or use existing thread
      let threadId = activeThreadId;
      let agentThreadId: string | null = conversations.find((c) => c.id === threadId)?.agentThreadId ?? null;

      if (!agentThreadId) {
        const created = await agentChat.createThread();
        agentThreadId = created.id;
        // Register in our table for our thread list
        const reg = await api.registerConversation({
          agentThreadId,
          projectId: projectId ?? null,
          title: content.slice(0, 60),
        });
        setConversations((prev) => [reg.conversation, ...prev]);
        setActiveThreadId(reg.conversation.id);
        threadId = reg.conversation.id;
        // Update URL so refresh keeps the thread
        const newPath = projectId ? `/chat/project/${projectId}/${reg.conversation.id}` : `/chat/${reg.conversation.id}`;
        navigate(newPath);
      }

      // Optimistic user message
      const userMsgId = `user-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: 'user', content },
        { id: `asst-${Date.now()}`, role: 'assistant', content: '', streaming: true, toolStatusLines: [] },
      ]);

      const pendingAssistantId = messages.length + 1;
      let accumulatedText = '';
      let finalCitations: CitationChipData[] = [];
      let toolStatusLines: Array<{ name: string; result?: string }> = [];

      const response = agentChat.sendMessage(agentThreadId!, content, {
        onText: (delta: string) => {
          accumulatedText += delta;
          setMessages((prev) => {
            const copy = [...prev];
            const lastIdx = copy.length - 1;
            if (copy[lastIdx]?.role === 'assistant') {
              copy[lastIdx] = { ...copy[lastIdx], content: accumulatedText };
            }
            return copy;
          });
        },
        onToolCallStart: (id: string, name: string) => {
          toolStatusLines = [...toolStatusLines, { name }];
          setMessages((prev) => {
            const copy = [...prev];
            const lastIdx = copy.length - 1;
            if (copy[lastIdx]?.role === 'assistant') {
              copy[lastIdx] = { ...copy[lastIdx], toolStatusLines: [...toolStatusLines] };
            }
            return copy;
          });
        },
        onToolCallResult: (id: string, output: unknown) => {
          // Extract citations if the tool returned source data
          const sourcesFromOutput = extractCitationsFromToolOutput(output);
          if (sourcesFromOutput.length > 0) {
            for (const s of sourcesFromOutput) {
              if (!finalCitations.find((c) => c.sourceId === s.sourceId)) {
                finalCitations.push({ ...s, num: finalCitations.length + 1 });
              }
            }
          }
        },
        onError: (err: unknown) => {
          console.error('Chat error:', err);
          useSession.getState().showToast('error', 'Chat error. Try again.');
        },
      });
      abortRef.current = response;

      await response;

      // Finalize the streaming message with citations
      setMessages((prev) => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        if (copy[lastIdx]?.role === 'assistant') {
          copy[lastIdx] = {
            ...copy[lastIdx],
            streaming: false,
            citations: finalCitations,
          };
        }
        return copy;
      });

      // Update conversation metadata in our table
      if (threadId) {
        api
          .updateConversationMeta({
            id: threadId,
            lastMessagePreview: accumulatedText.slice(0, 200),
          })
          .catch(() => {});
      }

    } catch (err) {
      console.error(err);
      useSession.getState().showToast('error', err instanceof Error ? err.message : 'Could not send');
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };

  const activeConvo = conversations.find((c) => c.id === activeThreadId);

  return (
    <div className="chat-grid" style={{ height: '100%', minHeight: 0, display: 'grid', gridTemplateColumns: '280px 1fr' }}>
      {/* Thread list */}
      <aside
        className="thread-list no-select"
        style={{
          background: 'var(--color-ironwood)',
          borderRight: '1px solid var(--color-graphite)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <header style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-graphite)' }}>
          <div className="type-label text-dust">
            {projectId ? 'PROJECT THREADS' : 'ALL THREADS'}
          </div>
          <Button
            variant="ghost"
            size="small"
            onClick={() => {
              setActiveThreadId(null);
              setMessages([]);
              navigate(projectId ? `/chat/project/${projectId}` : '/chat');
            }}
          >
            <IconPlus size={14} /> NEW
          </Button>
        </header>
        {projectId && (
          <Link href={`/projects/${projectId}`} style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-dust)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconArrowLeft size={12} /> <span className="type-label">BACK TO PROJECT</span>
          </Link>
        )}
        <div className="scroll-y" style={{ flex: 1 }}>
          {conversations.length === 0 ? (
            <div style={{ padding: 'var(--space-4)', color: 'var(--color-smoke)' }} className="type-ui-body-small">
              No threads yet. Start one.
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveThreadId(c.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: 'var(--space-3) var(--space-4)',
                  background: activeThreadId === c.id ? 'var(--color-gunmetal)' : 'transparent',
                  borderLeft: activeThreadId === c.id ? '2px solid var(--color-mojo-red)' : '2px solid transparent',
                  borderBottom: '1px solid var(--color-graphite)',
                  transition: 'background var(--transition-fast)',
                }}
              >
                <div className="type-ui-body-small" style={{ color: 'var(--color-bone-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.title}
                </div>
                {c.lastMessagePreview && (
                  <div className="type-caption text-dust" style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.lastMessagePreview}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat surface */}
      <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: '100%' }}>
        {messages.length === 0 ? (
          <EmptyThreadState onStart={(prompt) => sendMessage(prompt)} projectId={projectId} />
        ) : (
          <ChatThread messages={messages} />
        )}

        <ChatComposer
          value={input}
          onChange={setInput}
          onSend={() => sendMessage(input)}
          onStop={() => abortRef.current?.abort()}
          sending={sending}
        />
      </section>

      <style>{`
        @media (max-width: 768px) {
          .chat-grid { grid-template-columns: 1fr !important; }
          .thread-list { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function ChatThread({ messages }: { messages: ChatMessage[] }) {
  return (
    <StickToBottom className="scroll-y" style={{ flex: 1, minHeight: 0, position: 'relative' }} resize="smooth" initial="instant">
      <StickToBottom.Content style={{ padding: 'var(--space-8) clamp(16px, 4vw, 48px)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>
          {messages.map((m) => (m.role === 'user' ? <UserMessage key={m.id} msg={m} /> : <AssistantMessage key={m.id} msg={m} />))}
        </div>
      </StickToBottom.Content>
    </StickToBottom>
  );
}

function UserMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div
        style={{
          maxWidth: '75%',
          background: 'var(--color-gunmetal)',
          border: '1px solid var(--color-graphite)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          color: 'var(--color-bone-white)',
          fontSize: 15,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
        }}
      >
        {msg.content}
      </div>
    </div>
  );
}

function AssistantMessage({ msg }: { msg: ChatMessage }) {
  const [playing, setPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  const playAudio = async () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    if (!audioUrl) {
      setLoadingAudio(true);
      try {
        const res = await api.synthesizeVoiceOutput({ text: msg.content });
        setAudioUrl(res.audioUrl);
        audioRef.current = new Audio(res.audioUrl);
        audioRef.current.play();
        audioRef.current.onended = () => setPlaying(false);
        setPlaying(true);
      } catch (err) {
        useSession.getState().showToast('error', 'Could not play audio.');
      } finally {
        setLoadingAudio(false);
      }
    } else {
      audioRef.current?.play();
      setPlaying(true);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Monogram size={32} />
        <span className="type-label text-dust">
          <span style={{ color: 'var(--color-bone-white)' }}>MR. A</span>
        </span>
      </div>
      {/* Reserved min-height to prevent layout shift during streaming */}
      <div style={{ paddingLeft: 42, minHeight: msg.streaming ? '1.55em' : 0 }}>
        {/* Tool status lines */}
        {msg.toolStatusLines && msg.toolStatusLines.length > 0 && !msg.content && (
          <div style={{ marginBottom: 8 }}>
            {msg.toolStatusLines.slice(-3).map((t, i) => (
              <div key={i} className="type-mono-detail text-dust" style={{ opacity: 0.7, marginBottom: 2 }}>
                {t.name.toUpperCase().replace(/_/g, ' ')}...
              </div>
            ))}
          </div>
        )}
        {/* Body */}
        <div
          className={`type-prose ${msg.streaming ? 'streaming-cursor' : ''}`}
          style={{ whiteSpace: 'pre-wrap', color: 'var(--color-bone-white)' }}
        >
          {renderInlineFormatting(msg.content)}
          {msg.streaming && !msg.content && (
            <span className="thinking-dots" style={{ marginLeft: 0 }}><span /><span /><span /></span>
          )}
        </div>
        {/* Tool status summary after streaming */}
        {!msg.streaming && msg.toolStatusLines && msg.toolStatusLines.length > 0 && (
          <div className="type-mono-detail text-smoke" style={{ marginTop: 8 }}>
            {msg.toolStatusLines.length} {msg.toolStatusLines.length === 1 ? 'TOOL CALL' : 'TOOL CALLS'}
          </div>
        )}
      </div>

      {/* Citations — pre-allocated container, fade in after streaming */}
      <div
        style={{
          paddingLeft: 42,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          opacity: msg.streaming ? 0 : 1,
          transition: 'opacity 0.3s ease-out',
          minHeight: 4,
        }}
      >
        {!msg.streaming && msg.citations?.map((c) => <CitationChip key={c.sourceId} chip={c} />)}
      </div>

      {/* Speaker playback */}
      {!msg.streaming && msg.content && (
        <div style={{ paddingLeft: 42, marginTop: -4 }}>
          <button
            onClick={playAudio}
            disabled={loadingAudio}
            style={{
              color: playing ? 'var(--color-mojo-red)' : 'var(--color-dust)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: 0.8,
            }}
            title={playing ? 'Pause' : 'Play aloud'}
          >
            <IconVolume size={14} />
            <span className="type-mono-detail">{loadingAudio ? 'LOADING...' : playing ? 'PLAYING' : ''}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyThreadState({ onStart, projectId }: { onStart: (prompt: string) => void; projectId?: string }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'var(--space-8)' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
          <Monogram size={48} />
        </div>
        <h2 className="type-editorial-headline" style={{ marginBottom: 'var(--space-4)' }}>
          What are we working on?
        </h2>
        <p className="type-prose text-dust" style={{ maxWidth: 560, margin: '0 auto var(--space-8)' }}>
          Ask anything — Mr. A has Travis's full library organized and cited. Every answer points to the exact moment in the source.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', justifyContent: 'center', maxWidth: 560, margin: '0 auto' }}>
          {STARTER_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => onStart(p)}
              className="type-ui-body-small"
              style={{
                padding: '10px 16px',
                background: 'var(--color-ironwood)',
                border: '1px solid var(--color-graphite)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-bone-white)',
                transition: 'all var(--transition-fast)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-mojo-red)')}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--color-graphite)')}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatComposer({
  value,
  onChange,
  onSend,
  onStop,
  sending,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  sending: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: mimeType });
          const url = await platform.uploadFile(file);
          const { text } = await api.transcribeVoiceInput({ audioUrl: url });
          if (text) onChange(value ? `${value}\n${text}` : text);
        } catch (err) {
          console.error(err);
          useSession.getState().showToast('error', "Couldn't transcribe. Try typing.");
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      console.error(err);
      useSession.getState().showToast('error', 'Microphone access denied.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  return (
    <div
      style={{
        padding: 'var(--space-4) clamp(16px, 4vw, 48px)',
        borderTop: '1px solid var(--color-graphite)',
        background: 'var(--color-asphalt)',
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          background: 'var(--color-gunmetal)',
          border: '1px solid var(--color-graphite)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex',
          gap: 'var(--space-2)',
          alignItems: 'flex-end',
        }}
      >
        {recording ? (
          <div style={{ flex: 1, padding: '6px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 3,
                    background: 'var(--color-mojo-red)',
                    borderRadius: 2,
                    animation: `wave 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
                  }}
                />
              ))}
            </div>
            <span className="type-mono-detail text-dust">LISTENING...</span>
          </div>
        ) : transcribing ? (
          <div style={{ flex: 1, padding: '6px 0', color: 'var(--color-dust)' }} className="type-mono-detail">
            TRANSCRIBING...
          </div>
        ) : (
          <TextareaAutosize
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask Mr. A anything..."
            minRows={1}
            maxRows={8}
            disabled={sending}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--color-bone-white)',
              fontSize: 15,
              resize: 'none',
              fontFamily: 'var(--font-ui)',
              lineHeight: 1.5,
              outline: 'none',
            }}
          />
        )}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {!sending ? (
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={transcribing}
              aria-label={recording ? 'Stop recording' : 'Record voice'}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: recording ? 'var(--color-mojo-red)' : 'var(--color-dust)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {recording ? <IconPlayerStop size={18} /> : <IconMicrophone size={18} />}
            </button>
          ) : null}

          {sending ? (
            <button
              onClick={onStop}
              aria-label="Stop"
              style={{
                width: 36,
                height: 36,
                background: 'transparent',
                color: 'var(--color-mojo-red)',
                border: '1px solid var(--color-mojo-red)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconPlayerStop size={14} />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!value.trim()}
              aria-label="Send"
              style={{
                width: 36,
                height: 36,
                background: value.trim() ? 'var(--color-mojo-red)' : 'var(--color-graphite)',
                color: 'var(--color-bone-white)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background var(--transition-fast)',
              }}
            >
              <IconArrowUp size={18} />
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes wave {
          from { height: 6px; }
          to { height: 16px; }
        }
      `}</style>
    </div>
  );
}

// Extract citation data from a tool call output (searchConcepts, searchSources, etc.)
function extractCitationsFromToolOutput(output: unknown): CitationChipData[] {
  const citations: CitationChipData[] = [];
  const obj = output as Record<string, unknown>;
  if (!obj) return citations;

  const pushSource = (src: Record<string, unknown>) => {
    const sourceId = src.sourceId as string | undefined;
    if (!sourceId) return;
    const contextShortName = ((src.contextSlug ?? src.contextShortName) as string | undefined)?.toUpperCase() ?? '';
    const contentName = ((src.contentName as string | undefined) ?? '').toUpperCase();
    const locator = (src.locator as string | undefined) ?? null;
    const linkUrl = src.linkUrl as string | undefined;
    citations.push({ num: citations.length + 1, sourceId, contextShortName, contentName, locator, linkUrl });
  };

  if (Array.isArray(obj.sources)) {
    for (const s of obj.sources as Record<string, unknown>[]) pushSource(s);
  }
  if (Array.isArray(obj.topSources)) {
    for (const s of obj.topSources as Record<string, unknown>[]) pushSource(s);
  }
  return citations;
}

// Extract citations from persisted thread messages — placeholder since platform doesn't
// standardize this yet. We rely on live tool events for the current v1.
function extractCitationsFromMessage(_m: unknown): CitationChipData[] {
  return [];
}

// Very light inline renderer for Mr. A's reply text.
// Converts _italic_ to Mojo Red spans, [1] markers to styled citation numbers, and preserves newlines.
function renderInlineFormatting(text: string) {
  if (!text) return null;
  // Split by italic markers first
  const italicRegex = /_([^_]+)_/g;
  const parts: Array<string | { kind: 'italic'; text: string }> = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = italicRegex.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    parts.push({ kind: 'italic', text: m[1] });
    lastIdx = italicRegex.lastIndex;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));

  return parts.map((p, i) =>
    typeof p === 'string' ? (
      <span key={i}>{p}</span>
    ) : (
      <span key={i} style={{ color: 'var(--color-mojo-red)', fontWeight: 500 }}>
        {p.text}
      </span>
    )
  );
}
