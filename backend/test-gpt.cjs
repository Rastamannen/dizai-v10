// test-gpt.cjs - Fristående POC för att testa ChatGPT → DizAí-kommunikation

const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.TEST_PORT || 11000;

app.get("/api/test_message", async (req, res) => {
  try {
    const response = await axios.post(
      process.env.CHATGPT_EXERCISE_ENDPOINT,
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Du är en språkcoach i Johan och Petras Portugalprojekt och du interagerar med DizAí via API.",
          },
          {
            role: "user",
            content: "Return the current exercise message.",
          }
        ],
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const message = response.data?.choices?.[0]?.message?.content?.trim();
    console.log("🛰️ Response from GPT:", message);
    res.send(message || "❌ No content returned.");
  } catch (err) {
    console.error("❌ GPT test failed:", err);
    res.status(500).send("❌ GPT test failed.");
  }
});

app.listen(PORT, () => {
  console.log(`🧪 GPT test server running on http://localhost:${PORT}`);
});
