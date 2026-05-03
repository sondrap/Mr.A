import { auth, mindstudio } from '@mindstudio-ai/agent';
import { MODELS } from './common/models';

// Text → voice playback. Frontend calls this when the student taps the speaker icon on a Mr. A reply.
// We strip citation markers and markdown formatting before synthesis so the speaker doesn't read
// "bracket one bracket" or "asterisk asterisk bold asterisk asterisk" aloud.
export async function synthesizeVoiceOutput(input: { text: string }) {
  auth.requireRole('student', 'admin');

  if (!input.text) throw new Error('text is required.');

  const plain = stripForSpeech(input.text);
  if (!plain.trim()) throw new Error('Nothing to speak after stripping formatting.');

  try {
    const result = await mindstudio.textToSpeech({
      text: plain,
      speechModelOverride: {
        model: MODELS.TTS_MODEL,
        config: {
          // ElevenLabs config: voice ID + model tier. eleven_v3 is the
          // flagship — highest naturalness, slower than turbo. We
          // optimize for quality on a tap-to-play UX where a small
          // generation delay is acceptable.
          voice: MODELS.TTS_VOICE,
          model: 'eleven_v3',
        },
      },
    });

    return { audioUrl: result.audioUrl };
  } catch (err) {
    console.error('TTS synthesis failed:', err);
    throw new Error('There was an error synthesizing the audio. Check the logs for details.');
  }
}

// Strip markdown and citation markers from a Mr. A reply so the TTS speaks clean text.
function stripForSpeech(text: string): string {
  return text
    // Remove citation markers like [1], [12]
    .replace(/\[\d+\]/g, '')
    // Remove markdown bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks entirely
    .replace(/```[\s\S]*?```/g, ' ')
    // Convert markdown links [text](url) to just text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
