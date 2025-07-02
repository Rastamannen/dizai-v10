// server.cjs - DizAí backend v1.0 (med övningsflöde kopplat till GPT, förbättrad URL-hantering)

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
const CHATGPT_URL = process.env.CHATGPT_API_URL || "https://api.openai.com/v1/chat/completions";

app.use(cors());
app.use(express.json());

let exerciseCache = {}; // { profile: { exerciseSetId, exercises } }

async function fetchExercises(profile) {
  try {
    const response = await axios.post(
      CHATGPT_URL,
      {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `DizAí backend frågar efter aktuellt övningsset för ${profile}. Returnera endast JSON-data.`,
          },
        ],
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const content = response.data.choices?.[0]?.message?.content || "";
    const jsonStart = content.indexOf("[");
    const jsonEnd = content.lastIndexOf("]") + 1;
    const raw = content.slice(jsonStart, jsonEnd);
    const exercises = JSON.parse(raw);

    const exerciseSetId = `set-${Date.now()}`;
    return { exerciseSetId, exercises };
  } catch (err) {
    console.error("GPT fetch failed:", err);
    throw err;
  }
}

app.get("/api/exercise_set", async (req, res) => {
  const profile = req.query.profile || "default";
  try {
    const { exerciseSetId, exercises } = await fetchExercises(profile);
    res.json({ exerciseSetId, exercises });
  } catch {
    res.status(500).json({ error: "Exercise fetch failed" });
  }
});

app.post("/api/analyze", upload.single("audio"), async (req, res) => {
  const { profile, exerciseId, exerciseSetId } = req.body;
  const audioBuffer = req.file.buffer;

  const transcript = "Simulerad transkription";
  const feedback = "Perfect pronunciation!";

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
