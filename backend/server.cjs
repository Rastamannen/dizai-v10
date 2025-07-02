const express = require("express");
const multer = require("multer");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const upload = multer();

// Simulerad databas (ersätt med riktig GPT-källa i v1.5)
let dummyExercises = {
  Johan: [
    { exerciseId: "ex1", text: "Olá, como estás?", ipa: "oˈla ˈkomu ɨʃˈtaʃ", highlight: [2] },
    { exerciseId: "ex2", text: "Eu tenho um gato.", ipa: "ew ˈtɐɲu ũ ˈɡatu", highlight: [1, 3] },
  ],
  Petra: [
    { exerciseId: "ex1", text: "Bom dia!", ipa: "bõ ˈdiɐ", highlight: [1] },
    { exerciseId: "ex2", text: "Quero um café, por favor.", ipa: "ˈkɛɾu ũ kɐˈfɛ puɾ fɐˈvoɾ", highlight: [2, 4] },
  ],
};

app.get("/api/exercise_set", (req, res) => {
  const profile = req.query.profile || "Johan";
  res.json({ exerciseSetId: "default-chatgpt-set", exercises: dummyExercises[profile] || [] });
});

app.get("/api/tts", (req, res) => {
  const text = req.query.text || "Olá!";
  res.setHeader("Content-Type", "audio/mpeg");
  res.send(Buffer.from("FAKEAUDIO")); // Ersätt med riktig TTS
});

app.post("/api/analyze", upload.single("audio"), (req, res) => {
  const { profile, exerciseId, exerciseSetId } = req.body;
  const fakeTranscript = "Olá, como estás?";
  const fakeFeedback = "Almost correct! Watch your stress on 'estás'.";
  res.json({
    transcript: fakeTranscript,
    feedback: fakeFeedback,
    exerciseId,
    exerciseSetId,
    profile,
  });
});

app.listen(PORT, () => {
  console.log(`DizAí backend listening on port ${PORT}`);
});
