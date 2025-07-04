// db.js – init och lagring av feedbacklogg i SQLite
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./feedback.db");

function ensureInitialized() {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS feedback_log (
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
        feedback TEXT,
        status TEXT,
        timestamp TEXT
      )`,
      (err) => {
        if (err) return reject(err);
        console.log("📁 SQLite initialized with table: feedback_log");
        resolve();
      }
    );
  });
}

function saveFeedback(entry) {
  return new Promise((resolve, reject) => {
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
      feedback,
      status,
      timestamp,
    } = entry;

    db.run(
      `INSERT INTO feedback_log (
        profile, exerciseSetId, exerciseId, phrase, ipa, phonetic,
        userTranscript, refTranscript, deviations, feedback, status, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profile,
        exerciseSetId,
        exerciseId,
        phrase,
        ipa,
        phonetic,
        userTranscript,
        refTranscript,
        JSON.stringify(deviations),
        JSON.stringify(feedback),
        status,
        timestamp,
      ],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

module.exports = {
  ensureInitialized,
  saveFeedback,
};
