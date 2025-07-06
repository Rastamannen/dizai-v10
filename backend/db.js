// db.js – avskalad version utan lokal lagring (no-op implementering)

function ensureInitialized() {
  console.log("🧹 Skipping SQLite initialization – using GPT-only logging.");
  return Promise.resolve();
}

function saveFeedback(entry) {
  console.log("🪪 Skipping saveFeedback – GPT handles all feedback logging.");
  return Promise.resolve();
}

function saveInteraction(entry) {
  console.log("🗣️ Skipping saveInteraction – GPT handles all interaction logging.");
  return Promise.resolve();
}

function appendToJsonl(profile, sessionId, data) {
  console.log(`📄 Skipping appendToJsonl for profile ${profile}, session ${sessionId}`);
}

function run(sql, params = []) {
  console.log("⛔ Skipping direct SQL execution – db is deprecated.");
  return Promise.resolve();
}

module.exports = {
  ensureInitialized,
  saveFeedback,
  saveInteraction,
  appendToJsonl,
  run,
};
