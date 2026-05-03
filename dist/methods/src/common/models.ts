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

  // Text-to-speech for Mr. A voice playback. ElevenLabs v3 — best raw
  // naturalness available. No instruction prompt needed; voice character
  // comes from the voice ID itself. Brian = deep, measured, grounded;
  // closest match to the "older brother who's been in business 20 years"
  // brief from the agent character spec.
  //
  // Earlier configuration used OpenAI gpt-4o-mini-tts + 'onyx', which the
  // user described as boring and generic — the OpenAI voices read
  // synthesized regardless of how the instruction prompt was tuned.
  TTS_MODEL: 'elevenlabs-tts',
  // Chris (ElevenLabs preset). Casual, conversational American with
  // natural lift — better match for Travis-style "light and fun" energy
  // than Brian, who read as too anchorman-serious. Voice options that
  // could be swapped in if Chris doesn't land: Liam (TX3LPaxmHKxFdv7VOQHJ),
  // Charlie (IKne3meq5aSn9XLyUdCD), Will (bIHbv24MWmeRgasZH58o).
  TTS_VOICE: 'iP95p4xoKVk53GoZ742B',
  TTS_INSTRUCTIONS: '', // ElevenLabs ignores instruction prompts; left empty for future model swaps

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
