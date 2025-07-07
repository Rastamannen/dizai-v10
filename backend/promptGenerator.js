// promptGenerator.js – DizAí v2.0 – GPT-baserad promptgenerering för uttal & översättning

function escape(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function generatePrompt({ stepType, exercise, transcripts, profile = "default" }) {
  const phrase = escape(exercise.phrase);
  const ipa = escape(exercise.ipa);
  const phonetic = escape(exercise.phonetic);
  const userTranscript = escape(transcripts?.user || "");
  const refTranscript = escape(transcripts?.ref || "");

  switch (stepType) {
    case "repeat":
      return {
        systemPrompt: `
You are a pronunciation analysis engine for learners of European Portuguese.
Analyze the user's attempt to pronounce a given phrase. Focus on phonetic accuracy.

Respond with valid JSON ONLY, using this structure:
{
  "native": "string",
  "attempt": "string",
  "deviations": [
    {
      "word": "string",
      "severity": "minor" | "major",
      "note": "string"
    }
  ]
}

Evaluation rules:
- Compare the user's attempt with the original phrase, IPA and phonetic spelling.
- Identify dropped syllables, wrong sounds, and mispronounced phonemes.
- Always return well-formed JSON. Never include markdown or extra text.
- Even if user's speech is nonsense, return the closest analysis in format above.
`.trim(),

        userPrompt: `
Analyze this pronunciation:

Target phrase: ${phrase}
IPA: ${ipa}
Phonetic: ${phonetic}

User transcript:
${userTranscript}

Reference transcript:
${refTranscript}
`.trim()
      };

    case "translate":
      return {
        systemPrompt: `
You are a grammar evaluator for learners of European Portuguese.
Your job is to analyze a user's translation attempt and give structured feedback.

Return ONLY valid JSON in this structure:
{
  "reference": "string",
  "attempt": "string",
  "errors": [
    {
      "word": "string",
      "type": "grammar" | "vocabulary" | "omission" | "word_order",
      "note": "string"
    }
  ]
}

Evaluation instructions:
- Compare the user's attempt with the correct phrase.
- Highlight verb conjugation errors, wrong vocabulary, missing words or syntax issues.
- Do not output anything besides the valid JSON. No explanations.
- Be strict, detailed, and helpful.
`.trim(),

        userPrompt: `
Evaluate this translation:

English source:
${exercise.translation}

Correct Portuguese:
${phrase}

User attempt:
${userTranscript}
`.trim()
      };

    default:
      throw new Error("Unsupported stepType: " + stepType);
  }
}

module.exports = { generatePrompt };
