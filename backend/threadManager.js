// threadManager.js – DizAí v2.0 GPT-integrerad logik, verifierad loggning, robust JSON-hantering

let globalLogThreadId = null;
const threadCache = {};
const userFeedbackLogs = {};
const gptGlobalLogs = {};

// 🔍 Extraherar första JSON-objektet från en GPT-response
function extractFirstJsonObject(text) {
  const match = text.match(/```json\s*([\s\S]+?)\s*```/i) || text.match(/{[\s\S]+}/);
  const jsonStr = match ? (match[1] || match[0]) : null;
  if (!jsonStr) throw new Error("❌ No JSON found in GPT response.");
  return JSON.parse(jsonStr);
}

// Initierar en global GPT-loggtråd för struktur
async function createGlobalLogThread(openai) {
  if (globalLogThreadId) return;
  const thread = await openai.beta.threads.create();
  globalLogThreadId = thread.id;
  console.log("🧾 Global log thread created:", globalLogThreadId);
}

// Hämtar övningsset från GPT (temabaserat)
async function fetchExercises(openai, assistantId, profile, theme, exerciseCache, lockMap) {
  const cacheKey = `${profile}::${theme}`;
  if (lockMap[cacheKey]) return exerciseCache[cacheKey] || { exerciseSetId: null, exercises: [] };
  lockMap[cacheKey] = true;

  try {
    const thread = await openai.beta.threads.create();
    threadCache[cacheKey] = thread.id;

    const prompt = `Johan and Petra are learning European Portuguese using DizAí. Johan is now training on the theme "${theme}". Return a new exercise set in strict JSON format with a unique "exerciseSetId" starting with "${theme}-". Each exercise must include a unique "exerciseId", an IPA transcription, and an easy-to-read phonetic transcription. Use European Portuguese only.`;

    await openai.beta.threads.messages.create(thread.id, { role: "user", content: prompt });
    const run = await openai.beta.threads.runs.create(thread.id, { assistant_id: assistantId });

    let runStatus;
    do {
      await new Promise(res => setTimeout(res, 500));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    } while (runStatus.status !== "completed");

    const messages = await openai.beta.threads.messages.list(thread.id);
    const last = messages.data.find(m => m.role === "assistant");
    const content = last.content?.[0]?.text?.value?.trim();

    const parsed = extractFirstJsonObject(content);

    parsed.exercises = parsed.exercises.map((ex, i) => ({
      ...ex,
      exerciseId: ex.exerciseId?.trim() || `${parsed.exerciseSetId}--${i}`,
    }));

    exerciseCache[cacheKey] = { exerciseSetId: parsed.exerciseSetId, exercises: parsed.exercises };
    return exerciseCache[cacheKey];
  } catch (err) {
    console.error("🚫 Fetch failed:", err);
    return { exerciseSetId: null, exercises: [] };
  } finally {
    lockMap[cacheKey] = false;
  }
}

// Loggar feedback till personlig GPT-tråd och global loggtråd
async function logFeedback(openai, assistantId, threadKey, feedback) {
  const { profile } = feedback;
  userFeedbackLogs[profile] = userFeedbackLogs[profile] || [];
  userFeedbackLogs[profile].push(feedback);

  const logEntry = `LOG ENTRY:\n${JSON.stringify(feedback, null, 2)}`;
  const threadId = threadCache[threadKey];

  try {
    if (threadId) {
      await openai.beta.threads.messages.create(threadId, { role: "user", content: logEntry });
    }
    if (globalLogThreadId) {
      await openai.beta.threads.messages.create(globalLogThreadId, { role: "user", content: logEntry });
    }
  } catch (err) {
    console.warn("⚠️ GPT thread log failed:", err.message);
  }
}

// Loggar strukturerad feedback (v1-schema) till global tråd och intern cache
async function logFeedbackToGlobalThread(openai, feedback) {
  if (!globalLogThreadId) return;

  const structured = {
    type: "exercise_feedback_v1",
    profile: feedback.profile,
    exerciseSetId: feedback.exerciseSetId,
    exerciseId: feedback.exerciseId,
    phrase: feedback.phrase,
    ipa: feedback.ipa,
    phonetic: feedback.phonetic,
    userTranscript: feedback.userTranscript,
    refTranscript: feedback.refTranscript,
    feedbackType: "pronunciation",
    deviations: feedback.deviations || [],
    status: feedback.status,
    timestamp: feedback.timestamp
  };

  gptGlobalLogs[feedback.profile] = gptGlobalLogs[feedback.profile] || [];
  gptGlobalLogs[feedback.profile].push(structured);

  try {
    await openai.beta.threads.messages.create(globalLogThreadId, {
      role: "user",
      content: `FEEDBACK_LOG:\n${JSON.stringify(structured)}`
    });
  } catch (err) {
    console.warn("⚠️ Structured GPT log failed:", err.message);
  }
}

// Hämtar lokal användarlogg för debug/speglad vy
function getUserFeedbackLogs(profile) {
  return userFeedbackLogs[profile] || [];
}

// Hämtar GPT:s strukturerade logg för en viss profil (debug/analys)
function getGlobalGPTLogs(profile) {
  return gptGlobalLogs[profile] || [];
}

module.exports = {
  createGlobalLogThread,
  fetchExercises,
  logFeedback,
  logFeedbackToGlobalThread,
  getUserFeedbackLogs,
  getGlobalGPTLogs
};
