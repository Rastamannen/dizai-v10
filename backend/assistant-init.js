// assistant-init.js – skapar GPT-assistent för DizAí och sparar ID i .env

const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
require("dotenv").config();

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Saknar OPENAI_API_KEY i .env");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INSTRUCTIONS = `
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
`;

async function createAndSaveAssistant() {
  try {
    const assistant = await openai.beta.assistants.create({
      name: "DizAí Exercise Generator",
      instructions: INSTRUCTIONS,
      model: "gpt-4o",
      tools: [],
    });

    console.log("✅ Assistant skapad:", assistant.id);

    const envPath = path.resolve(__dirname, ".env");
    let envContent = fs.readFileSync(envPath, "utf-8");

    if (envContent.includes("OPENAI_ASSISTANT_ID=")) {
      envContent = envContent.replace(/OPENAI_ASSISTANT_ID=.*/g, `OPENAI_ASSISTANT_ID=${assistant.id}`);
    } else {
      envContent += `\nOPENAI_ASSISTANT_ID=${assistant.id}`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log("✅ Assistant ID sparat i .env");

  } catch (err) {
    console.error("❌ Assistant creation failed:", err.message);
    process.exit(1);
  }
}

createAndSaveAssistant();
