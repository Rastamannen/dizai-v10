// promptGenerator.js – Genererar situationsanpassade GPT-promptar för DizAí

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
You are a pronunciation analysis engine for European Portuguese.
Your task is to analyze how well a user pronounces a given phrase.

Return ONLY valid JSON in this format:
{
  "native": "string",
  "attempt": "string",
  "deviations": [
    {
      "word": "string",
      "severity": "minor"|"major",
      "note": "string"
    }
  ]
}

Guidelines:
- Compare the user's attempt to the original phrase and IPA.
- Identify missing, mispronounced or replaced phonemes.
- Always return valid JSON even if the input is nonsense.
- Do NOT explain, justify or wrap in markdown.
`.trim(),

        userPrompt: `
Analyze this pronunciation attempt.

Phrase: ${phrase}
IPA: ${ipa}
Phonetic: ${phonetic}

User said:
${userTranscript}

Reference transcript:
${refTranscript}
`.trim()
      };

    case "translate":
      return {
        systemPrompt: `
You are a grammar and translation evaluator for learners of European Portuguese.
Your task is to assess the quality of a user's translation attempt from English to Portuguese.

Return ONLY valid JSON in this format:
{
  "reference": "string",
  "attempt": "string",
  "errors": [
    {
      "word": "string",
      "type": "grammar"|"vocabulary"|"omission"|"word_order",
      "note": "string"
    }
  ]
}

Guidelines:
- Focus on grammatical accuracy and vocabulary usage.
- Highlight incorrect verb forms, missing words, or wrong word choices.
- Don't return any explanation outside the JSON structure.
- Be strict but helpful.
`.trim(),

        userPrompt: `
Evaluate this translation attempt.

English sentence:
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
