// server.cjs - DizAí backend v1.0 (med övningsflöde kopplat till GPT via agnostisk polling)

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

app.get("/api/exercise_set", async (req, res) => {
  const profile = req.query.profile || "default";

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `DizAí is requesting the current active pronunciation exercises for profile '${profile}'.
Return the current active exerciseSet in the following JSON format:
{
  "exerciseSetId": "set-abc123",
  "exercises": [
    {
      "text": "Uma água sem gás, por favor.",
      "ipa": "'umɐ 'aɡwɐ sɐ̃j 'ɡaʃ poɾ fɐ'voɾ",
      "highlight": [1, 4],
      "exerciseId": "ex-001"
    }, ...
  ]
}`,
          },
        ],
        temperature: 0.5,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { exerciseSetId, exercises } = JSON.parse(response.data.choices[0].message.content);

    if (
      !exerciseCache[profile] ||
      exerciseCache[profile].exerciseSetId !== exerciseSetId
    ) {
      exerciseCache[profile] = { exerciseSetId, exercises };
    }

    res.json({
      exerciseSetId: exerciseCache[profile].exerciseSetId,
      exercises: exerciseCache[profile].exercises,
    });
  } catch (err) {
    console.error("GPT fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch exercises" });
  }
});

app.post("/api/analyze", upload.single("audio"), async (req, res) => {
  const { profile, exerciseId, exerciseSetId } = req.body;
  const audioBuffer = req.file.buffer;

  console.log(`Received analysis request from ${profile}, ex: ${exerciseId}`);

  // Simulerad analys
  const transcript = "Simulerad transkription";
  const feedback = "Perfect pronunciation!";

  // TODO: logga till ChatGPT eller backend-lagring
  console.log({ profile, exerciseId, exerciseSetId, transcript, feedback });

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
