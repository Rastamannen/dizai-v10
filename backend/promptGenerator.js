// promptGenerator.js – DizAí v2.1 – Förbättrad GPT-baserad promptgenerering med fonemnivåfeedback

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
Your task is to analyze a user's pronunciation of a given phrase. Focus on phonetic accuracy.

Return ONLY valid JSON in this exact structure:
{
  "native": "string",         // The reference phrase
  "attempt": "string",        // What the user said
  "deviations": [             // List of detected deviations
    {
      "word": "string",       // Word in the phrase with deviation
      "phoneme": "string",    // Specific phoneme with issue
      "severity": "minor" | "major",
      "note": "string"        // Brief description of the issue
    }
  ],
  "status": "perfect" | "almost" | "tryagain",  // Overall rating
  "comment": "string"         // One-sentence feedback summary
}

Rules:
- Use the IPA and phonetic spelling as guides to assess the user's accuracy.
- If user says something unrelated, still try to analyze the closest match.
- Always include status and comment, even if no deviations are found.
- NEVER include markdown, explanations, or text outside the JSON.
- JSON must be valid and parseable. No markdown formatting.
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
You are a grammar and translation evaluator for learners of European Portuguese.
Your job is to analyze a user's translation attempt and provide structured feedback.

Return ONLY valid JSON using this structure:
{
  "reference": "string",   // Correct translation
  "attempt": "string",     // User's version
  "errors": [
    {
      "word": "string",    // Word or phrase with an issue
      "type": "grammar" | "vocabulary" | "omission" | "word_order",
      "note": "string"     // Explanation of the problem
    }
  ],
  "status": "perfect" | "almost" | "tryagain",  // Overall quality
  "comment": "string"      // Brief user-friendly feedback
}

Evaluation instructions:
- Compare the user's translation with the reference.
- Identify incorrect verb forms, missing or misplaced words, or wrong vocabulary.
- NEVER include anything outside the JSON object.
- Always return well-formed JSON, even if the user's input is very poor.
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
