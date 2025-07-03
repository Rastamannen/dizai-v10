// server.cjs – DizAí backend v1.0 med GPT-styrd temahantering (körlås + cachning per profil+tema)

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
const threadCache = {}; // key: profile::theme => threadId
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

    if (!threadCache[cacheKey]) {
      const thread = await openai.beta.threads.create();
      threadCache[cacheKey] = thread.id;
      console.log("🧵 Created thread for", cacheKey);
    }

    const prompt = `You are DizAí's assistant. The active profile is ${profile}. The user is currently training on the theme \"${theme}\". Return a full exercise set in strictly valid JSON format.`;

    await openai.beta.threads.messages.create(threadCache[cacheKey], {
      role: "user",
      content: prompt,
    });

    const run = await openai.beta.threads.runs.create(threadCache[cacheKey], {
      assistant_id: ASSISTANT_ID,
    });

    let runStatus;
    do {
      await new Promise((resolve) => setTimeout(resolve, 500));
      runStatus = await openai.beta.threads.runs.retrieve(threadCache[cacheKey], run.id);
      console.log("⏳ Run status:", runStatus.status);
    } while (runStatus.status !== "completed");

    const messages = await openai.beta.threads.messages.list(threadCache[cacheKey]);
    const last = messages.data.find((m) => m.role === "assistant");
    const content = last.content?.[0]?.text?.value?.trim();
    console.log("🧠 Raw assistant content:", content);

    if (!content) throw new Error("No content in assistant response");

    let parsed;
    try {
      parsed = JSON.parse(content);
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

app.get("/api/exercise_set", async (req, res) => {
  const profile = req.query.profile || "default";
  const theme = req.query.theme || "everyday";
  console.log("📥 Incoming /exercise_set request:", profile, theme);

  const { exerciseSetId, exercises } = await fetchExercises(profile, theme);

  res.json({ exerciseSetId, exercises });
});

app.post("/api/analyze", upload.single("audio"), async (req, res) => {
  const { profile, exerciseId, exerciseSetId } = req.body;
  const audioBuffer = req.file?.buffer;
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
