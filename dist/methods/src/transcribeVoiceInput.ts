import { auth, mindstudio } from '@mindstudio-ai/agent';
import { MODELS } from './common/models';

// Voice input → text. Frontend uploads a webm/opus recording via platform.uploadFile(),
// then calls this method with the resulting CDN URL. We pass the URL to the platform's
// transcription service with a domain-specific prompt that hints at the vocabulary
// used in these conversations (improves accuracy on terms like T1, Giving Funnel, CD3).
export async function transcribeVoiceInput(input: { audioUrl: string }) {
  auth.requireRole('student', 'admin');

  if (!input.audioUrl) throw new Error('audioUrl is required.');

  try {
    const result = await mindstudio.transcribeAudio({
      audioUrl: input.audioUrl,
      prompt:
        'Business coaching conversation. Speaker uses marketing jargon: T1, T2, T3, hand-raiser, ' +
        'Giving Funnel, coffee date, BFOT, CD3, hell island, heaven island, the chooser, training wheels, ' +
        'crockpot thinker, BEM, Skool group, tappers, niche validation, Royalty Rockstars. ' +
        'Proper nouns: Travis, Beamer, Kajabi, Smart Lead.',
      transcriptionModelOverride: {
        model: MODELS.STT,
      },
    });

    return { text: result.text ?? '' };
  } catch (err) {
    console.error('Voice transcription failed:', err);
    throw new Error("Couldn't transcribe that. Check the logs for details.");
  }
}
