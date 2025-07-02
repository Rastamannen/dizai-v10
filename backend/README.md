# DizAí v0.9 – Backend

## Install
1. Lägg din OpenAI Whisper-nyckel i `.env` som `OPENAI_API_KEY`.
2. Skaffa ett Google Cloud-projekt, aktivera Text-to-Speech API, ladda ner keyfile.
3. Lägg sökvägen till keyfile i `.env` som `GOOGLE_APPLICATION_CREDENTIALS`.
4. `npm install`
5. `node server.js`

API:
- `POST /analyze` (audio, profile, exerciseId) → feedback, score, transcript, IPA
- `GET /exercises` → alla övningar
- `GET /tts?text=xxx` → TTS (pt-PT) mp3
