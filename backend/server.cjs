// server.cjs – DizAí v1.4 (refined phonetic feedback, no hardcoded reference)

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const axios = require("axios");
const morgan = require("morgan");
const { Readable } = require("stream");
const { OpenAI } = require("openai");
const textToSpeech = require("@google-cloud/text-to-speech");
const { File } = require("formdata-node");

const app = express();
const upload = multer();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const gcpTTSClient = new textToSpeech.TextToSpeechClient();

const ASSISTANT_ID = process.env.ASSISTANT_ID;
const exerciseCache = {};
const threadCache = {};
const lockMap = {};
let globalLogThreadId = null;

async function createGlobalLogThread() {
  if (globalLogThreadId) return;
  try {
    const thread = await openai.beta.threads.create();
    globalLogThreadId = thread.id;
    console.log("🧾 Global log thread created:", globalLogThreadId);
  } catch (err) {
    console.error("❌ Failed to create global log thread:", err);
  }
}

async function fetchExercises(profile, theme) {
  const cacheKey = `${profile}::${theme}`;
  if (lockMap[cacheKey]) return exerciseCache[cacheKey] || { exerciseSetId: null, exercises: [] };
  lockMap[cacheKey] = true;
  try {
    const thread = await openai.beta.threads.create();
    threadCache[cacheKey] = thread.id;

    const prompt = `Johan and Petra are learning European Portuguese together using DizAí. Johan is training on the theme "${theme}". Return a new exercise set in strict JSON format with a unique "exerciseSetId" starting with "${theme}-". Use European Portuguese only. Include IPA and a user-friendly phonetic spelling. Avoid generic topics. Each exercise must have a unique "exerciseId".`;

    await openai.beta.threads.messages.create(thread.id, { role: "user", content: prompt });
    const run = await openai.beta.threads.runs.create(thread.id, { assistant_id: ASSISTANT_ID });

    let runStatus;
    do {
      await new Promise(res => setTimeout(res, 500));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    } while (runStatus.status !== "completed");

    const messages = await openai.beta.threads.messages.list(thread.id);
    const last = messages.data.find(m => m.role === "assistant");
    const content = last.content?.[0]?.text?.value?.trim();
    const parsed = JSON.parse(content);

    parsed.exercises = parsed.exercises.map((ex, i) => ({
      ...ex,
      exerciseId: ex.exerciseId?.trim() || `${parsed.exerciseSetId}--${i}`,
    }));

    exerciseCache[cacheKey] = { exerciseSetId: parsed.exerciseSetId, exercises: parsed.exercises };
    return exerciseCache[cacheKey];
  } catch (err) {
    console.error("🚫 Fetch failed:", err);
    return { exerciseSetId: null, exercises: [] };
  } finally {
    lockMap[cacheKey] = false;
  }
}

app.get("/api/exercise_set", async (req, res) => {
  const profile = req.query.profile || "default";
  const theme = req.query.theme || "everyday";
  const result = await fetchExercises(profile, theme);
  res.json(result);
});

app.post("/api/exercise_set", async (req, res) => {
  const { profile = "default", theme = "everyday" } = req.body;
  const result = await fetchExercises(profile, theme);
  res.json(result);
});

app.post("/api/analyze", upload.fields([{ name: "audio" }, { name: "ref" }]), async (req, res) => {
  const { profile, exerciseId, exerciseSetId } = req.body;
  const theme = exerciseSetId?.split("-")[0];
  const threadKey = `${profile}::${theme}`;
  const exercise = exerciseCache[threadKey]?.exercises?.find(e => e.exerciseId === exerciseId) || {};

  try {
    const userAudio = req.files?.audio?.[0]?.buffer;
    const refAudio = req.files?.ref?.[0]?.buffer;
    if (!userAudio || !refAudio) throw new Error("Both audio files required");

    const userFile = new File([userAudio], "user.webm", { type: "audio/webm" });
    const refFile = new File([refAudio], "ref.webm", { type: "audio/webm" });

    const userTrans = await openai.audio.transcriptions.create({ file: userFile, model: "whisper-1", response_format: "verbose_json" });
    const refTrans = await openai.audio.transcriptions.create({ file: refFile, model: "whisper-1", response_format: "verbose_json" });

    const gptPrompt = `You will compare the pronunciation in two recordings of the same phrase in European Portuguese. One is a native reference, the other is a learner's attempt.

Return a JSON object with:
- native: the native speaker's transcript
- attempt: the user's transcript
- deviations: an array of objects for each word where the user's pronunciation deviated, each including:
  - word: the user’s word
  - severity: "minor" or "major"
  - note: short note explaining the mispronunciation

Be concise, objective, and use English throughout. Avoid filler text.`;

    const chat = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a phonetic pronunciation expert for European Portuguese." },
        { role: "user", content: gptPrompt },
        { role: "user", content: `Native transcript:\n${refTrans.text}\n\nUser transcript:\n${userTrans.text}` }
      ]
    });

    const parsedFeedback = chat.choices[0]?.message?.content;
    const parsed = JSON.parse(parsedFeedback);

    const feedbackObject = {
      profile,
      exerciseSetId,
      exerciseId,
      phrase: exercise.phrase,
      ipa: exercise.ipa,
      phonetic: exercise.phonetic,
      userTranscript: parsed.attempt,
      refTranscript: parsed.native,
      deviations: parsed.deviations,
      status: parsed.deviations?.length ? "tryagain" : "perfect",
      timestamp: new Date().toISOString(),
    };

    const threadId = threadCache[threadKey];
    if (threadId && ASSISTANT_ID) {
      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: `Feedback for ${profile} on exerciseId ${exerciseId} in set ${exerciseSetId}:
${JSON.stringify(feedbackObject, null, 2)}`
      });
      if (globalLogThreadId) {
        await openai.beta.threads.messages.create(globalLogThreadId, {
          role: "user",
          content: `LOG ENTRY:
${JSON.stringify(feedbackObject, null, 2)}`
        });
      }
    }

    res.json(feedbackObject);
  } catch (err) {
    console.error("❌ Analysis error:", err);
    res.json({ transcript: "", feedback: "Error during analysis: " + err.message });
  }
});

app.get("/api/tts", async (req, res) => {
  const text = req.query.text;
  if (!text) return res.status(400).send("Text required");

  const request = {
    input: { text },
    voice: {
      languageCode: "pt-PT",
      name: "pt-PT-Standard-A",
    },
    audioConfig: {
      audioEncoding: "MP3",
    },
  };

  try {
    const [response] = await gcpTTSClient.synthesizeSpeech(request);
    res.set({ "Content-Type": "audio/mpeg" });
    res.send(response.audioContent);
  } catch (err) {
    console.error("❌ Google TTS failed:", err);
    res.status(500).send("TTS failed");
  }
});

createGlobalLogThread();

app.listen(PORT, () => {
  console.log(`✅ DizAí backend listening on port ${PORT}`);
});
