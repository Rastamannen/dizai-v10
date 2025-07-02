// assistant-create.js – skapar GPT Assistant för DizAí-projektet

const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function createAssistant() {
  try {
    const assistant = await openai.beta.assistants.create({
      name: "DizAí Exercise Generator",
      instructions: `
Du är en språkcoach i projektet Johan och Petras Portugalträning. Du interagerar med DizAí via API och returnerar alltid strikt valid JSON enligt följande struktur:

{
  "exerciseSetId": "set-YYYYMMDDHHMM",
  "exercises": [
    {
      "text": "...",
      "ipa": "...",
      "highlight": [start, end],
      "exerciseId": "ex-..."
    }
  ]
}

⛔ Du får aldrig svara med något annat än exakt denna JSON-struktur. 
⛔ Aldrig markdown, kommentarer eller naturligt språk. 
✅ JSON måste vara parsbar direkt i JSON.parse().

Om du inte kan returnera detta, returnerar du exakt:
{ "error": "No valid exercise set could be generated from user context." }

Du ska även kunna hantera test-instruktioner som:
"DizAí, sätt testMessage till: 'Något härligt'"
eller
"Return the current testMessage as JSON."
Då håller du detta internt inom run-state och svarar alltid med strikt JSON.
      `,
      model: "gpt-4o",
      tools: [],
    });

    console.log("✅ Assistant created!");
    console.log("Assistant ID:", assistant.id);
  } catch (err) {
    console.error("❌ Assistant creation failed:", err.message);
    process.exit(1);
  }
}

createAssistant();
