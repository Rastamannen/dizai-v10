// server.cjs - DizAí backend v1.0, full funktionalitet + strikt JSON-stöd från GPT

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const upload = multer();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

let cachedExerciseSet = {
  exerciseSetId: null,
  exercises: [],
};

async function fetchExercises(profile) {
  try {
    const response = await axios.post(
      process.env.CHATGPT_EXERCISE_ENDPOINT,
      {
        messages: [
          {
            role: "user",
            content: `DizAí, current profile is ${profile}. Return exercise set.`,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const data = response.data;
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) throw new Error("No content from GPT");

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("GPT JSON parse error:", content);
      return { exerciseSetId: null, exercises: [] };
    }

    if (parsed.error) {
      console.warn("GPT responded with error key:", parsed.error);
      return { exerciseSetId: null, exercises: [] };
    }

    return {
      exerciseSetId: parsed.exerciseSetId,
      exercises: parsed.exercises,
    };
  } catch (err) {
    console.error("fetchExercises failed:", err.message);
    return { exerciseSetId: null, exercises: [] };
  }
}

app.get("/api/exercise_set", async (req, res) => {
  const profile = req.query.profile || "default";
  const { exerciseSetId, exercises } = await fetchExercises(profile);

  if (exerciseSetId && exerciseSetId !== cachedExerciseSet.exerciseSetId) {
    cachedExerciseSet = { exerciseSetId, exercises };
  }

  res.json({
    exerciseSetId: cachedExerciseSet.exerciseSetId,
    exercises: cachedExerciseSet.exercises,
  });
});

app.post("/api/analyze", upload.single("audio"), async (req, res) => {
  const { profile, exerciseId, exerciseSetId } = req.body;
  const audioBuffer = req.file.buffer;

  // Placeholder – här sker framtida uttalsanalys
  const transcript = "Simulerad transkription";
  const feedback = "Perfect pronunciation!";

  console.log({ profile, exerciseId, exerciseSetId, transcript, feedback });

  res.json({ transcript, feedback });
});

app.get("/api/tts", async (req, res) => {
  const text = req.query.text;
  if (!text) return res.status(400).send("Text required");

  try {
    const tts = await axios.post(
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
    res.send(tts.data);
  } catch (err) {
    console.error("TTS generation failed:", err.message);
    res.status(500).send("TTS failed");
  }
});

app.listen(PORT, () => {
  console.log(`DizAí backend listening on port ${PORT}`);
});
