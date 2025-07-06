// db.js – init och lagring av feedbacklogg + interaktionslogg i SQLite

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const db = new sqlite3.Database("./feedback.db");

// Initiera båda tabellerna
function ensureInitialized() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
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
        )`
      );

      db.run(
        `CREATE TABLE IF NOT EXISTS interaction_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          profile TEXT,
          scenarioId TEXT,
          exerciseSetId TEXT,
          exerciseId TEXT,
          stepId TEXT,
          role TEXT,
          stepType TEXT,
          prompt TEXT,
          userInput TEXT,
          refResponse TEXT,
          ipa TEXT,
          phonetic TEXT,
          feedbackType TEXT,
          feedback TEXT,
          deviations TEXT,
          status TEXT,
          timestamp TEXT
        )`,
        (err) => {
          if (err) return reject(err);
          console.log("📁 SQLite initialized with tables: feedback_log, interaction_log");
          resolve();
        }
      );
    });
  });
}

// Legacy feedback_log
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

// Ny loggning till interaction_log
function saveInteraction(entry) {
  return new Promise((resolve, reject) => {
    const {
      profile,
      scenarioId,
      exerciseSetId,
      exerciseId,
      stepId,
      role,
      stepType,
      prompt,
      userInput,
      refResponse,
      ipa,
      phonetic,
      feedbackType,
      feedback,
      deviations,
      status,
      timestamp,
    } = entry;

    db.run(
      `INSERT INTO interaction_log (
        profile, scenarioId, exerciseSetId, exerciseId, stepId, role, stepType,
        prompt, userInput, refResponse, ipa, phonetic,
        feedbackType, feedback, deviations, status, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profile,
        scenarioId,
        exerciseSetId,
        exerciseId,
        stepId,
        role,
        stepType,
        prompt,
        userInput,
        refResponse,
        ipa,
        phonetic,
        feedbackType,
        JSON.stringify(feedback),
        JSON.stringify(deviations),
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

// Spara ostrukturerad .jsonl-logg per session
function appendToJsonl(profile, sessionId, data) {
  const logsDir = path.join(__dirname, "logs", profile);
  const filePath = path.join(logsDir, `${sessionId}.jsonl`);
  const line = JSON.stringify(data) + "\n";

  fs.mkdirSync(logsDir, { recursive: true });
  fs.appendFile(filePath, line, (err) => {
    if (err) console.error("❌ Failed to append to JSONL log:", err);
  });
}

// Valfri generisk SQL-funktion
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

module.exports = {
  ensureInitialized,
  saveFeedback,
  saveInteraction,
  appendToJsonl,
  run,
};
