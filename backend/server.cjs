// server.cjs - DizAí backend v1.0 med OpenAI Assistant integration, strikt JSON-hantering, fallback och loggning

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const axios = require("axios");
const { OpenAI } = require("openai");

const app = express();
const upload = multer();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.ASSISTANT_ID;
let cachedThreadId = null;

let cachedExerciseSet = {
  exerciseSetId: null,
  exercises: [],
};

async function fetchExercises(profile) {
  try {
    if (!ASSISTANT_ID) throw new Error("Missing ASSISTANT_ID");
    if (!cachedThreadId) {
      const thread = await openai.beta.threads.create();
      cachedThreadId = thread.id;
    }

    const msg = await openai.beta.threads.messages.create(cachedThreadId, {
      role: "user",
      content: `DizAí, current profile is ${profile}. Return exercise set.`,
    });

    const run = await openai.beta.threads.runs.create(cachedThreadId, {
      assistant_id: ASSISTANT_ID,
    });

    let runStatus;
    do {
      await new Promise((resolve) => setTimeout(resolve, 500));
      runStatus = await openai.beta.threads.runs.retrieve(cachedThreadId, run.id);
    } while (runStatus.status !== "completed");

    const messages = await openai.beta.threads.messages.list(cachedThreadId);
    const last = messages.data.find((m) => m.role === "assistant");

    const content = last.content?.[0]?.text?.value?.trim();
    if (!content) throw new Error("No content in assistant response");

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("❌ JSON parse error from assistant:", content);
      return { exerciseSetId: null, exercises: [] };
    }

    return {
      exerciseSetId: parsed.exerciseSetId,
      exercises: parsed.exercises,
    };
  } catch (err) {
    console.error("Assistant fetch failed:", err.message);
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

  const transcript = "Simulerad transkription";
  const feedback = "Perfect pronunciation!";

  console.log({
    profile,
    exerciseId,
    exerciseSetId,
    transcript,
    feedback,
  });

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
    console.error("TTS failed", err);
    res.status(500).send("TTS failed");
  }
});

app.listen(PORT, () => {
  console.log(`✅ DizAí backend listening on port ${PORT}`);
});
