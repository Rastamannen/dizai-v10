// db.js – SQLite-hantering för DizAí feedbacklogg
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "feedback.db");
const db = new sqlite3.Database(dbPath);

// Initiera tabell vid uppstart
function initDB() {
  db.run(`
    CREATE TABLE IF NOT EXISTS feedback_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile TEXT,
      exerciseSetId TEXT,
      exerciseId TEXT,
      phrase TEXT,
      ipa TEXT,
      phonetic TEXT,
      userTranscript TEXT,
      refTranscript TEXT,
      deviations TEXT,
      status TEXT,
      timestamp TEXT
    )
  `);
}

function saveFeedback(feedback) {
  const {
    profile,
    exerciseSetId,
    exerciseId,
    phrase,
    ipa,
    phonetic,
    userTranscript,
    refTranscript,
    deviations,
    status,
    timestamp
  } = feedback;

  const stmt = db.prepare(`
    INSERT INTO feedback_log (
      profile, exerciseSetId, exerciseId, phrase, ipa, phonetic,
      userTranscript, refTranscript, deviations, status, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    profile,
    exerciseSetId,
    exerciseId,
    phrase,
    ipa,
    phonetic,
    userTranscript,
    refTranscript,
    JSON.stringify(deviations),
    status,
    timestamp
  );

  stmt.finalize();
}

module.exports = {
  initDB,
  saveFeedback
};
