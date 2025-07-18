// server.js – DizAí backend v2.1, full GPT-loggning som master + uttalsanalys med fonemnivå och status

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const morgan = require("morgan");
const { OpenAI } = require("openai");
const textToSpeech = require("@google-cloud/text-to-speech");
const { File } = require("undici");
const threadManager = require("./threadManager");
const { generatePrompt } = require("./promptGenerator");

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

function getFeedbackStatus(parsed) {
  if (parsed?.status === "perfect" || parsed?.status === "almost" || parsed?.status === "tryagain") {
    return parsed.status;
  }
  const devs = parsed?.deviations || [];
  if (!devs.length) return "perfect";
  if (devs.some(d => d.severity === "major")) return "tryagain";
  return "almost";
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

    const { systemPrompt, userPrompt } = generatePrompt({
      stepType: "repeat",
      exercise,
      transcripts: {
        user: userTrans.text,
        ref: refTrans.text
      }
    });

    const chat = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    const parsed = chat.choices?.[0]?.message?.content
      ? JSON.parse(chat.choices[0].message.content)
      : { native: "", attempt: "", deviations: [], status: "tryagain", comment: "" };

    const feedbackObject = {
      profile,
      exerciseSetId,
      exerciseId,
      phrase: exercise.phrase,
      ipa: exercise.ipa,
      phonetic: exercise.phonetic,
      userTranscript: userTrans.text,
      refTranscript: refTrans.text,
      deviations: parsed.deviations || [],
      feedback: parsed,
      status: getFeedbackStatus(parsed),
      comment: parsed.comment || "",
      timestamp: new Date().toISOString()
    };

    await threadManager.logFeedback(openai, ASSISTANT_ID, threadKey, feedbackObject);
    await threadManager.logFeedbackToGlobalThread(openai, feedbackObject);

    res.json({ transcript: userTrans.text, feedback: parsed });
  } catch (err) {
    console.error("❌ Analysis error:", err);
    res.json({ transcript: "", feedback: { error: "Error during analysis: " + err.message } });
  }
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
  await threadManager.createGlobalLogThread(openai);
  app.listen(PORT, () => {
    console.log(`✅ DizAí backend listening on port ${PORT}`);
  });
})();
