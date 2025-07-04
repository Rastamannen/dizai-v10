// threadManager.js – hantering av tråd-ID:n för persistens

const fs = require("fs");
const path = require("path");

const THREAD_FILE = path.join(__dirname, "data", "threads.json");

function loadThreads() {
  try {
    const raw = fs.readFileSync(THREAD_FILE);
    return JSON.parse(raw);
  } catch {
    return {}; // tom om ej finns
  }
}

function saveThreads(map) {
  fs.mkdirSync(path.dirname(THREAD_FILE), { recursive: true });
  fs.writeFileSync(THREAD_FILE, JSON.stringify(map, null, 2));
}

function getThread(profile, theme) {
  const key = `${profile}::${theme}`;
  const threads = loadThreads();
  return threads[key] || null;
}

function setThread(profile, theme, threadId) {
  const key = `${profile}::${theme}`;
  const threads = loadThreads();
  threads[key] = threadId;
  saveThreads(threads);
}

module.exports = { getThread, setThread };
