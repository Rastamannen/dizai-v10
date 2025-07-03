// server.cjs – DizAí backend v1.3 (Global thread logging fixed)

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
const threadCache = {};   // key: profile::theme => thread.id
const lockMap = {};       // key: profile::theme => lock flag
let globalLogThreadId = null;

function getFeedbackStatus(feedback) {
  const f = feedback.toLowerCase();
  if (f.includes("perfect")) return "perfect";
  if (f.includes("almost")) return "almost";
  return "tryagain";
}

async function createGlobalLogThread() {
  if (globalLogThreadId) return;
  try {
    const thread = await openai.beta.threads.create();
    globalLogThreadId = thread.id;
    console.log("🧾 Global log thread created:", globalLogThreadId);
  } catch (err) {
    console.warn("⚠️ Failed to create global log thread:", err.message);
  }
}

async function fetchExercises(profile, theme) {
  const cacheKey = `${profile}::${theme}`;
  if (lockMap[cacheKey]) {
    console.warn("⚠️ Run already in progress for", cacheKey);
    return exerciseCache[cacheKey] || { exerciseSetId: null, exercises: [] };
  }

  lockMap[cacheKey] = true;

  try {
    if (!ASSISTANT_ID) throw new Error("Missing ASSISTANT_ID");

    const thread = await openai.beta.threads.create();
    threadCache[cacheKey] = thread.id;

    const prompt = `Johan and Petra are learning European Portuguese together using DizAí. Johan is training on the theme "${theme}". Return a new exercise set in strict JSON format with a unique "exerciseSetId" starting with "${theme}-". Use European Portuguese only. Include IPA and a user-friendly phonetic spelling. Avoid generic topics unless theme explicitly requires it. Each exercise must have a unique "exerciseId".`;

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
      if (!parsed.exerciseSetId || !parsed.exercises) {
        throw new Error("Parsed JSON missing required fields");
      }

      parsed.exercises = parsed.exercises.map((ex, i) => {
        let safeId = ex.exerciseId?.toString().trim();
        if (!safeId) {
          safeId = `${parsed.exerciseSetId}--${i}`;
        }
        return { ...ex, exerciseId: safeId };
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

app.get("/api/exercise_set", async (req, res) => {
  const profile = req.query.profile || "default";
  const theme = req.query.theme || "everyday";
  console.log("📥 Incoming GET /exercise_set:", profile, theme);

  const { exerciseSetId, exercises } = await fetchExercises(profile, theme);
  res.json({ exerciseSetId, exercises });
});

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

  try {
    const theme = exerciseSetId?.split("-")[0];
    const threadKey = `${profile}::${theme}`;
    const threadId = threadCache[threadKey];

    if (threadId && ASSISTANT_ID) {
      const exercise = exerciseCache[threadKey]?.exercises?.find(
        (ex) => ex.exerciseId === exerciseId
      ) || {};

      const message = `Feedback for ${profile} on exerciseId ${exerciseId} in set ${exerciseSetId}:
Phrase: ${exercise.phrase || ""}
IPA: ${exercise.ipa || ""}
Respelling: ${exercise.phonetic || ""}
Transcript: ${transcript}
Feedback: ${feedback}
Status: ${getFeedbackStatus(feedback)}
Time: ${new Date().toISOString()}`;

      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: message,
      });

      if (globalLogThreadId) {
        await openai.beta.threads.messages.create(globalLogThreadId, {
          role: "user",
          content: `LOG ENTRY: ${profile} did exercise ${exerciseId} (${exercise.phrase || ""})\nTranscript: ${transcript}\nFeedback: ${feedback}`,
        });
      }
    }
  } catch (err) {
    console.warn("⚠️ Could not send feedback to assistant:", err.message);
  }

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

createGlobalLogThread();

app.listen(PORT, () => {
  console.log(`✅ DizAí backend listening on port ${PORT}`);
});
