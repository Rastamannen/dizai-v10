// threadManager.js – DizAí v1.6.1 thread + feedback manager
let globalLogThreadId = null;
const threadCache = {};
const userFeedbackLogs = {};

async function createGlobalLogThread(openai) {
  if (globalLogThreadId) return;
  const thread = await openai.beta.threads.create();
  globalLogThreadId = thread.id;
  console.log("🧾 Global log thread created:", globalLogThreadId);
}

async function fetchExercises(openai, assistantId, profile, theme, exerciseCache, lockMap) {
  const cacheKey = `${profile}::${theme}`;
  if (lockMap[cacheKey]) return exerciseCache[cacheKey] || { exerciseSetId: null, exercises: [] };
  lockMap[cacheKey] = true;
  try {
    const thread = await openai.beta.threads.create();
    threadCache[cacheKey] = thread.id;

    const prompt = `Johan and Petra are learning European Portuguese together using DizAí. Johan is training on the theme "${theme}". Return a new exercise set in strict JSON format with a unique "exerciseSetId" starting with "${theme}-". Use European Portuguese only. Include IPA and a user-friendly phonetic spelling. Avoid generic topics. Each exercise must have a unique "exerciseId".`;

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

    const jsonMatch = content.match(/```json\s*([\s\S]+?)\s*```/i) || content.match(/{[\s\S]+}/);
    const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : null;
    const parsed = JSON.parse(jsonString);

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

async function logFeedback(openai, assistantId, threadKey, feedback) {
  const { profile } = feedback;
  userFeedbackLogs[profile] = userFeedbackLogs[profile] || [];
  userFeedbackLogs[profile].push(feedback);

  const logEntry = `LOG ENTRY:\n${JSON.stringify(feedback, null, 2)}`;
  const threadId = threadCache[threadKey];
  if (threadId) {
    await openai.beta.threads.messages.create(threadId, { role: "user", content: logEntry });
  }
  if (globalLogThreadId) {
    await openai.beta.threads.messages.create(globalLogThreadId, { role: "user", content: logEntry });
  }
}

function getUserFeedbackLogs(profile) {
  return userFeedbackLogs[profile] || [];
}

module.exports = {
  createGlobalLogThread,
  fetchExercises,
  logFeedback,
  getUserFeedbackLogs
};
