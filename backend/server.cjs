// server.cjs – DizAí v1.6.4 backend med GPT-logg, SQLite-lagring och undici-File
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const axios = require("axios");
const morgan = require("morgan");
const { OpenAI } = require("openai");
const textToSpeech = require("@google-cloud/text-to-speech");
const { File } = require("undici");
const threadManager = require("./threadManager");
const db = require("./db");

const app = express();
const upload = multer();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("combined"));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const gcpTTSClient = new textToSpeech.TextToSpeechClient();

const ASSISTANT_ID = process.env.ASSISTANT_ID;
const exerciseCache = {};
const lockMap = {};

function getFeedbackStatus(text) {
  if (text.toLowerCase().includes("perfect")) return "perfect";
  return "tryagain";
}

app.get("/api/exercise_set", async (req, res) => {
  const profile = req.query.profile || "default";
  const theme = req.query.theme || "everyday";
  const result = await threadManager.fetchExercises(openai, ASSISTANT_ID, profile, theme, exerciseCache, lockMap);
  res.json(result);
});

app.post("/api/exercise_set", async (req, res) => {
  const { profile = "default", theme = "everyday" } = req.body;
  const result = await threadManager.fetchExercises(openai, ASSISTANT_ID, profile, theme, exerciseCache, lockMap);
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

    const userTrans = await openai.audio.transcriptions.create({
      file: userFile,
      model: "whisper-1",
      response_format: "verbose_json",
      language: "pt"
    });

    const refTrans = await openai.audio.transcriptions.create({
      file: refFile,
      model: "whisper-1",
      response_format: "verbose_json",
      language: "pt"
    });

    console.log("🧪 Transcripts sent to GPT:");
    console.log("➡️ User:", userTrans.text);
    console.log("✅ Ref:", refTrans.text);

    const gptPrompt = `Compare the pronunciation in these two utterances of the European Portuguese phrase "${exercise.phrase}". One is a native reference, the other is the user's attempt. Do not rely solely on the transcription text. Even if they appear identical, assume the user may still have phonetic inaccuracies. Focus on differences in pronunciation. Highlight any phonetic issues (e.g. final 's' pronounced hard, wrong vowel quality, nasal errors, dropped syllables, rhythm, intonation, etc.). Return:
- Native phrase
- User's attempt
- Word-level deviations with severity (minor/major) and short note
Return a JSON object with fields: native, attempt, deviations.`;

    const chat = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a phonetic pronunciation expert for European Portuguese." },
        { role: "user", content: gptPrompt },
        { role: "user", content: `User transcript:\n${userTrans.text}\n\nReference transcript:\n${refTrans.text}` }
      ]
    });

    const gptContent = chat.choices[0]?.message?.content || "{}";
    const jsonMatch = gptContent.match(/```json\s*([\s\S]+?)\s*```/i) || gptContent.match(/{[\s\S]+}/);
    const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : null;
    const parsed = JSON.parse(jsonString);

    const feedbackObject = {
      profile,
      exerciseSetId,
      exerciseId,
      phrase: exercise.phrase,
      ipa: exercise.ipa,
      phonetic: exercise.phonetic,
      userTranscript: userTrans.text,
      refTranscript: refTrans.text,
      deviations: parsed.deviations,
      feedback: parsed,
      status: getFeedbackStatus(JSON.stringify(parsed)),
      timestamp: new Date().toISOString(),
    };

    await threadManager.logFeedback(openai, ASSISTANT_ID, threadKey, feedbackObject);
    await db.saveFeedback(feedbackObject);

    await axios.post("http://localhost:" + PORT + "/api/gptlog", feedbackObject).catch((e) => {
      console.warn("⚠️ Could not send GPT log:", e.message);
    });

    res.json({ transcript: userTrans.text, feedback: parsed });
  } catch (err) {
    console.error("❌ Analysis error:", err);
    res.json({ transcript: "", feedback: "Error during analysis: " + err.message });
  }
});

app.post("/api/gptlog", async (req, res) => {
  const feedback = req.body;
  console.log("📡 GPT log received:", JSON.stringify(feedback, null, 2));
  res.json({ status: "received" });
});

app.get("/api/tts", async (req, res) => {
  const text = req.query.text;
  if (!text) return res.status(400).send("Text required");

  const request = {
    input: { text },
    voice: { languageCode: "pt-PT", name: "pt-PT-Standard-A" },
    audioConfig: { audioEncoding: "MP3" },
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

(async () => {
  await db.ensureInitialized(); // ⬅️ Skapar tabellen om den inte finns
  await threadManager.createGlobalLogThread(openai);
  app.listen(PORT, () => {
    console.log(`✅ DizAí backend listening on port ${PORT}`);
  });
})();
