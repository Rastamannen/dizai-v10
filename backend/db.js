// db.js – DizAí v2.0 GPT-only arkitektur, ingen lokal lagring

function ensureInitialized() {
  console.log("🧹 Skipping SQLite initialization – GPT-only architecture enabled.");
  return Promise.resolve();
}

function saveFeedback(entry) {
  console.log("🪪 Feedback logging bypassed – GPT is master. Entry:", entry?.exerciseId || "unknown");
  return Promise.resolve();
}

function saveInteraction(entry) {
  console.log("🗣️ Interaction logging bypassed – GPT is master. Step:", entry?.stepId || "n/a");
  return Promise.resolve();
}

function appendToJsonl(profile, sessionId, data) {
  console.log(`📄 JSONL log skipped – profile=${profile}, session=${sessionId}`);
}

function run(sql, params = []) {
  console.log("⛔ Direct SQL access disabled – database removed.");
  return Promise.resolve();
}

module.exports = {
  ensureInitialized,
  saveFeedback,
  saveInteraction,
  appendToJsonl,
  run,
};
