// promptGenerator.js – Genererar situationsanpassade GPT-promptar

function escape(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function generatePrompt({ stepType, exercise, transcripts }) {
  const phrase = escape(exercise.phrase);
  const ipa = escape(exercise.ipa);
  const phonetic = escape(exercise.phonetic);
  const userTranscript = escape(transcripts.user);
  const refTranscript = escape(transcripts.ref);

  switch (stepType) {
    case "repeat":
    default:
      return {
        systemPrompt: `
You are a pronunciation analysis engine for European Portuguese.
You will receive:
- the native phrase
- the user's transcription
- the reference transcription

You must return only valid JSON, in the following format:
{
  "native": "string",                  // the reference phrase
  "attempt": "string",                 // what the user said
  "deviations": [
    {
      "word": "string",               // the word where there's a problem
      "severity": "minor"|"major",   // how severe the issue is
      "note": "string"               // explanation of the deviation
    }
  ]
}

Rules:
- Match the user's words with the reference phrase.
- Flag incorrect pronunciation, missing words, or phonetic replacements.
- Never return markdown, text, or formatting outside JSON.
- If the user transcript is nonsense or very short, still return valid JSON.
- Never guess – explain clearly what is wrong.

You are not a chatbot. You are a strict pronunciation API.
`.trim(),

        userPrompt: `
Analyze this European Portuguese pronunciation.

Phrase: ${phrase}
IPA: ${ipa}
Phonetic guide: ${phonetic}

User said:
${userTranscript}

Reference transcription:
${refTranscript}
`.trim()
      };
  }
}

module.exports = { generatePrompt };
