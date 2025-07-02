// assistant-poc.js – DizAí Assistants API POC for testMessage

const axios = require("axios");
require("dotenv").config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;
let threadId = null;

async function createThreadIfNeeded() {
  if (threadId) return threadId;
  const response = await axios.post(
    "https://api.openai.com/v1/threads",
    {},
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
      },
    }
  );
  threadId = response.data.id;
  return threadId;
}

async function runTestMessagePrompt(prompt) {
  const thread = await createThreadIfNeeded();

  // Add message to thread
  await axios.post(
    `https://api.openai.com/v1/threads/${thread}/messages`,
    {
      role: "user",
      content: prompt,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
      },
    }
  );

  // Run the assistant on the thread
  const runRes = await axios.post(
    `https://api.openai.com/v1/threads/${thread}/runs`,
    {
      assistant_id: ASSISTANT_ID,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2",
        "Content-Type": "application/json",
      },
    }
  );

  const runId = runRes.data.id;

  // Poll for completion
  let status = "queued";
  let output = null;
  while (status !== "completed") {
    const res = await axios.get(
      `https://api.openai.com/v1/threads/${thread}/runs/${runId}`,
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "assistants=v2",
        },
      }
    );
    status = res.data.status;
    if (status === "completed") {
      const msgRes = await axios.get(
        `https://api.openai.com/v1/threads/${thread}/messages`,
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v2",
          },
        }
      );
      output = msgRes.data.data[0].content[0].text.value;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("\n🔄 Assistant Response:", output);
  try {
    const parsed = JSON.parse(output);
    console.log("\n✅ Parsed JSON Response:", parsed);
  } catch (err) {
    console.error("\n❌ Invalid JSON:", output);
  }
}

// Example usage:
const prompt = "DizAí, sätt testMessage till: \"Nu testar vi detta med Assistants API\"";
runTestMessagePrompt(prompt);
