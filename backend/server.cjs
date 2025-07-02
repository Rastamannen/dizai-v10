// server.cjs - DizAí backend v1.0 med full implementering av användningsfall 1

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
require("dotenv").config();

const app = express();
const upload = multer();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

let exerciseCache = {}; // structure: { profileName: { exerciseSetId, exercises } }

async function fetchExercisesFromChatGPT(profile) {
  const prompt = `You are a language coach helping ${profile} learn European Portuguese. Generate 5 short pronunciation exercises suitable for a restaurant scenario. Each exercise should have a Portuguese sentence, its IPA transcription, and a list of word indexes that are critical for pronunciation (highlight).

Return as a JSON array like:
[
  {
    "text": "Uma mesa para dois, por favor.",
    "ipa": "'umɐ 'mezɐ 'paɾɐ 'dojʃ poɾ fɐ'voɾ",
    "highlight": [1, 4],
    "exerciseId": "ex-001"
  }, ...
]`;

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const exercises = JSON.parse(response.data.choices[0].message.content);
  const exerciseSetId = `set-${Date.now()}`;
  exerciseCache[profile] = { exerciseSetId, exercises };
  return { exerciseSetId, exercises };
}

app.get("/api/exercise_set", async (req, res) => {
  const profile = req.query.profile || "default";

  if (exerciseCache[profile]) {
    res.json({
      exerciseSetId: exerciseCache[profile].exerciseSetId,
      exercises: exerciseCache[profile].exercises,
    });
  } else {
    try {
      const { exerciseSetId, exercises } = await fetchExercisesFromChatGPT(profile);
      res.json({ exerciseSetId, exercises });
    } catch (err) {
      console.error("GPT fetch failed:", err);
      res.status(500).json({ error: "Failed to fetch exercises" });
    }
  }
});

app.post("/api/analyze", upload.single("audio"), async (req, res) => {
  const { profile, exerciseId, exerciseSetId } = req.body;
  const audioBuffer = req.file.buffer;

  // --- Simulerad analys ---
  const transcript = "Simulerad transkription";
  const feedback = "Perfect pronunciation!";

  // --- Skicka till GPT (feedbackloop) ---
  const logPrompt = `
A user just completed an exercise in the DizAí platform.

Profile: ${profile}
Exercise ID: ${exerciseId}
Exercise Set ID: ${exerciseSetId}
Transcript: ${transcript}
Feedback: ${feedback}

Use this to refine future pronunciation exercises for this user.
`;

  try {
    await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: logPrompt }],
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.warn("Could not send feedback to GPT:", err.message);
  }

  res.json({ transcript, feedback });
});

app.get("/api/tts", async (req, res) => {
  const text = req.query.text;
  const lang = req.query.lang || "pt-PT";

  if (!text) return res.status(400).send("Text required");

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/audio/speech",
      {
        model: "tts-1",
        voice: "shimmer",
        input: text,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    res.set({ "Content-Type": "audio/mpeg" });
    res.send(response.data);
  } catch (err) {
    console.error("TTS failed", err);
    res.status(500).send("TTS failed");
  }
});

app.listen(PORT, () => {
  console.log(`DizAí backend listening on port ${PORT}`);
});
