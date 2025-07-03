// server.cjs – DizAí backend v1.0 (GET + POST + ny tråd per tema, strikt JSON)

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const axios = require("axios");
const morgan = require("morgan");
const { OpenAI } = require("openai");

const app = express();
const upload = multer();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.ASSISTANT_ID;
const exerciseCache = {}; // key: profile::theme => { exerciseSetId, exercises }
const lockMap = {}; // key: profile::theme => lock flag

async function fetchExercises(profile, theme) {
  const cacheKey = `${profile}::${theme}`;
  if (lockMap[cacheKey]) {
    console.warn("⚠️ Run already in progress for", cacheKey);
    return exerciseCache[cacheKey] || { exerciseSetId: null, exercises: [] };
  }

  lockMap[cacheKey] = true;

  try {
    if (!ASSISTANT_ID) throw new Error("Missing ASSISTANT_ID");

    // 🧵 Ny tråd för varje nytt tema – undvik kontextspill!
    const thread = await openai.beta.threads.create();

    const prompt = `Johan and Petra are learning European Portuguese together using DizAí. Johan is training on the theme "${theme}". Return a new exercise set in strict JSON format with a unique "exerciseSetId" starting with "${theme}-". Each exercise must include a unique string "exerciseId" field. Use European Portuguese only. Include IPA. Avoid generic topics unless theme explicitly requires it.`;

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: prompt,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    let runStatus;
    do {
      await new Promise((resolve) => setTimeout(resolve, 500));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log("⏳ Run status:", runStatus.status);
    } while (runStatus.status !== "completed");

    const messages = await openai.beta.threads.messages.list(thread.id);
    const last = messages.data.find((m) => m.role === "assistant");
    const content = last.content?.[0]?.text?.value?.trim();

    console.log("🧠 Raw assistant content:", content);

    if (!content) throw new Error("No content in assistant response");

    let parsed;
    try {
      parsed = JSON.parse(content);
      if (!parsed.exerciseSetId || !Array.isArray(parsed.exercises)) {
        throw new Error("Parsed JSON missing required fields");
      }

      // Ensure all exercises have unique exerciseId
      parsed.exercises = parsed.exercises.map((ex, i) => {
        if (!ex.exerciseId) {
          ex.exerciseId = `${parsed.exerciseSetId}--${i}`;
        }
        return ex;
      });

      console.log("✅ Parsed exercise set:", parsed.exerciseSetId);
    } catch (err) {
      console.error("❌ JSON parse error from assistant:", content);
      return { exerciseSetId: null, exercises: [] };
    }

    exerciseCache[cacheKey] = {
      exerciseSetId: parsed.exerciseSetId,
      exercises: parsed.exercises,
    };
    return exerciseCache[cacheKey];
  } catch (err) {
    console.error("🚫 Assistant fetch failed:", err.message);
    return { exerciseSetId: null, exercises: [] };
  } finally {
    lockMap[cacheKey] = false;
  }
}

// ✅ GET route (backward compatible)
app.get("/api/exercise_set", async (req, res) => {
  const profile = req.query.profile || "default";
  const theme = req.query.theme || "everyday";
  console.log("📥 Incoming GET /exercise_set:", profile, theme);

  const { exerciseSetId, exercises } = await fetchExercises(profile, theme);
  res.json({ exerciseSetId, exercises });
});

// ✅ POST route (frontend-triggered temabyte)
app.post("/api/exercise_set", async (req, res) => {
  const { profile = "default", theme = "everyday" } = req.body;
  console.log("📥 Incoming POST /exercise_set:", profile, theme);

  const { exerciseSetId, exercises } = await fetchExercises(profile, theme);
  res.json({ exerciseSetId, exercises });
});

app.post("/api/analyze", upload.single("audio"), async (req, res) => {
  const { profile, exerciseId, exerciseSetId } = req.body;
  const transcript = "Simulated transcript";
  const feedback = "Perfect pronunciation!";

  console.log("🎧 Analyze request received", {
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
