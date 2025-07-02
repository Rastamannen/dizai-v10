// server.cjs - DizAí backend v1.0 (utan promptstyrning, helt agnostisk)

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const upload = multer();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

let exerciseCache = {}; // { profileName: { exerciseSetId, exercises } }

async function fetchExercises(profile) {
  const response = await axios.post(
    process.env.CHATGPT_EXERCISE_API_URL,
    { profile },
    {
      headers: {
        Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const { exerciseSetId, exercises } = response.data;
  exerciseCache[profile] = { exerciseSetId, exercises };
  return { exerciseSetId, exercises };
}

app.get("/api/exercise_set", async (req, res) => {
  const profile = req.query.profile || "default";

  try {
    const { exerciseSetId, exercises } = await fetchExercises(profile);
    res.json({ exerciseSetId, exercises });
  } catch (err) {
    console.error("Exercise fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch exercises" });
  }
});

app.post("/api/analyze", upload.single("audio"), async (req, res) => {
  const { profile, exerciseId, exerciseSetId } = req.body;
  const audioBuffer = req.file.buffer;

  // Simulated analysis — replace with real logic in v1.5
  const transcript = "Simulerad transkription";
  const feedback = "Perfect pronunciation!";

  // Feedback post-back (to ChatGPT or logging system)
  try {
    await axios.post(
      process.env.CHATGPT_FEEDBACK_API_URL,
      {
        profile,
        exerciseId,
        exerciseSetId,
        transcript,
        feedback,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.warn("Feedback post-back failed:", err.message);
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
