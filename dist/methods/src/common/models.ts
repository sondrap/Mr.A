// Central catalog of model IDs used across MRA. One place to change if we swap providers.
// Verified against the MindStudio SDK as of v1 build.
export const MODELS = {
  // Primary chat agent (Mr. A). Strong tool use + 8k output tokens, balanced cost.
  CHAT: 'claude-4-6-sonnet',

  // Workflow task agents for generation. Strong structured output in tool loops.
  WORKFLOW_GENERATOR: 'claude-4-6-sonnet',

  // Adversarial reviewer. Different family (Google) so the reviewer doesn't share
  // the generator's blind spots. Fast + large context + cheap.
  REVIEWER: 'gemini-3-flash',

  // Concept-linker for ingestion. Pure classification task, cheapest + fastest.
  CONCEPT_LINKER: 'gpt-4.1-nano',

  // Normalized tag generator for knowledge_gaps clustering. Same floor model.
  TAG_GENERATOR: 'gpt-4.1-nano',

  // Text-to-speech model for Mr. A voice playback. Accepts instructions field.
  TTS_MODEL: 'gpt-4o-mini-tts',

  // TTS voice selection. Onyx = warm, focused, non-smarmy male voice.
  TTS_VOICE: 'onyx',

  // TTS instructions that set Mr. A's vocal persona. Used with gpt-4o-mini-tts.
  TTS_INSTRUCTIONS:
    'Speak as a focused, direct coaching partner. Measured pace, warm but not effusive. ' +
    'No rising inflection at end of statements. Confident and calm. Avoid over-enunciation.',

  // Speech-to-text for voice input. Native webm/opus support.
  STT: 'elevenlabs-scribe-v2',
} as const;

// Pre-built modelOverride configs. The SDK requires `temperature` and `maxResponseTokens` to be set
// explicitly whenever modelOverride is used, so we centralize the defaults here.
export const MODEL_CONFIGS = {
  // Reviewer: low temp for consistent critique, 4k tokens is plenty for a structured verdict
  REVIEWER: {
    model: MODELS.REVIEWER,
    temperature: 0.2,
    maxResponseTokens: 4000,
  },
  // Concept linker: deterministic classification, moderate tokens for the structured output
  CONCEPT_LINKER: {
    model: MODELS.CONCEPT_LINKER,
    temperature: 0.1,
    maxResponseTokens: 3000,
  },
  // Tag generator: tiny, single short output
  TAG_GENERATOR: {
    model: MODELS.TAG_GENERATOR,
    temperature: 0.2,
    maxResponseTokens: 100,
  },
  // Workflow generator: moderate temperature for creative but not wild drafts
  WORKFLOW_GENERATOR: {
    model: MODELS.WORKFLOW_GENERATOR,
    temperature: 0.5,
    maxResponseTokens: 8000,
  },
} as const;
