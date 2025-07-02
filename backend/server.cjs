const express = require('express');
const multer = require('multer');
const cors = require('cors');
const exercises = require('./exercises.json');
const { analyzePronunciation } = require('./whisperUtil.cjs');
const { ttsAudio } = require('./ttsUtil.cjs');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

// ========= Logging helper ==========
function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

// === /analyze ===
app.post('/analyze', upload.single('audio'), async (req, res) => {
  log('Received /analyze request');
  try {
    const { profile, exerciseId } = req.body;
    const filePath = req.file.path;
    log(`Processing file: ${filePath} for profile=${profile} exerciseId=${exerciseId}`);
    log('File size:', fs.statSync(filePath).size, 'bytes');
    const result = await analyzePronunciation(filePath, profile, exerciseId);
    fs.unlinkSync(filePath); // remove uploaded webm
    log('Done. Deleted original file:', filePath);
    res.json(result);
  } catch (err) {
    log('❌ Error in /analyze:', err);
    res.status(500).json({ error: err.message });
  }
});

// === /exercises ===
app.get('/exercises', (req, res) => {
  res.json(exercises);
});

// === /tts ===
app.get('/tts', async (req, res) => {
  const { text, type } = req.query;
  log(`/tts request for text="${text}" type="${type}"`);
  try {
    const audioBuffer = await ttsAudio(text, type || "pt-PT");
    res.set({
      'Content-Type': 'audio/mp3',
      'Content-Disposition': 'inline; filename="tts.mp3"'
    });
    res.send(audioBuffer);
  } catch (err) {
    log('❌ Error in /tts:', err);
    res.status(500).json({ error: err.message });
  }
});

// === /test === (valfritt, för curl-test)
app.get("/test", async (req, res) => {
  const profile = req.query.profile || "Johan";
  const exerciseId = parseInt(req.query.exerciseId) || 0;
  const filePath = path.join(__dirname, "sample-audio.webm");
  log(`/test: Analyzing sample audio for ${profile}, ex ${exerciseId}`);
  try {
    const result = await analyzePronunciation(filePath, profile, exerciseId);
    res.json(result);
  } catch (err) {
    log("❌ Error in /test:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  log('✅ Backend live on http://localhost:3001');
});
