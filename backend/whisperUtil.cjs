const OpenAI = require("openai");
const exercises = require("./exercises.json");
const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function convertToWav(inputPath) {
  const outputPath = inputPath + ".wav";
  // Skriv över om redan finns (garanterat temporär)
  try {
    execSync(`ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}"`);
  } catch (e) {
    console.error("❌ FFmpeg failed!", e.stderr?.toString() || e.message);
    throw new Error("Could not convert audio to WAV (ffmpeg error).");
  }
  return outputPath;
}

async function analyzePronunciation(filePath, profile, exerciseId) {
  console.log(`/analyze: Starting transcription for ${filePath} (exerciseId=${exerciseId}, profile=${profile})`);

  // Konvertera till WAV
  const wavPath = convertToWav(filePath);
  console.log(`Converted ${filePath} to ${wavPath} for Whisper API`);

  const maxRetries = 3;
  let attempt = 0;
  let transcript = "";
  let lastError = null;

  while (attempt < maxRetries) {
    attempt++;
    try {
      console.log(`→ Transcription attempt ${attempt}`);
      const audioStream = fs.createReadStream(wavPath);

      const resp = await openai.audio.transcriptions.create({
        file: audioStream,
        model: "whisper-1",
        response_format: "json",
        language: "pt",
      });

      transcript = resp.text.trim();
      break; // Success
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Retry ${attempt} failed!`);
      console.warn("TRANSCRIBE ERROR:", err.message || err);
      if (err.response?.data) {
        console.warn("TRANSCRIBE RESPONSE:", err.response.data);
      }
      if (attempt === maxRetries) throw new Error("Transcription failed after 3 retries");
    }
  }

  // Ta bort den temporära WAV-filen efteråt
  try { fs.unlinkSync(wavPath); } catch (e) {}

  // ----- ANALYS (samma som förut) -----
  const ex = exercises[profile][exerciseId];
  const ref = ex.text.toLowerCase();
  const spoken = transcript.toLowerCase();

  let score = 0;
  let highlight = [];
  const refWords = ref.split(/\s+/);
  const spokenWords = spoken.split(/\s+/);
  refWords.forEach((w, i) => {
    if (spokenWords[i] && spokenWords[i] === w) score++;
    else highlight.push(i);
  });
  const percent = (score / refWords.length) * 100;

  let feedback = "";
  if (percent === 100) feedback = "Perfect!";
  else if (percent > 70) feedback = "Almost! Check highlighted words.";
  else feedback = "Try again. Pay attention to pronunciation.";

  return {
    transcript,
    reference: ex.text,
    ipa: ex.ipa,
    score: percent,
    feedback,
    highlight,
  };
}

module.exports = { analyzePronunciation };
