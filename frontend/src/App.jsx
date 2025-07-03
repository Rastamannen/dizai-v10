// App.jsx – DizAí v1.1 (IPA + respelling toggle, full feedback, exerciseId fix)

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./index.css";
import logoUrl from "./assets/DizAi_FullLogo.svg";

const API_URL =
  window.location.hostname.includes("onrender.com")
    ? "https://dizai-v09.onrender.com"
    : "http://localhost:10000";

const FEEDBACK_COLORS = {
  perfect: "#197d1d",
  almost: "#D49F1B",
  tryagain: "#D1495B",
};

function getFeedbackColor(feedback) {
  if (!feedback) return "#222";
  if (feedback.toLowerCase().includes("perfect")) return FEEDBACK_COLORS.perfect;
  if (feedback.toLowerCase().includes("almost")) return FEEDBACK_COLORS.almost;
  return FEEDBACK_COLORS.tryagain;
}

function getExerciseText(ex) {
  return ex.text || ex.phrase || ex.sentence || "";
}

function getExerciseIPA(ex) {
  return ex.ipa || ex.IPA || ex.phonetic_transcription || "";
}

function getRespelling(ex) {
  return ex.respelling || "";
}

export default function App() {
  const [profile, setProfile] = useState("Johan");
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [exerciseSetId, setExerciseSetId] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("dizai-theme") || "everyday");
  const [feedback, setFeedback] = useState("");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);
  const [showIPA, setShowIPA] = useState(true);
  const [showRespelling, setShowRespelling] = useState(false);
  const mediaRecorderRef = useRef();

  useEffect(() => {
    loadExerciseSet(theme);
  }, [profile]);

  useEffect(() => {
    if (!exercises.length) return;
    setTranscript("");
    setFeedback("");
    const text = getExerciseText(exercises[exerciseIdx]);
    setAudioUrl(text ? `${API_URL}/api/tts?text=${encodeURIComponent(text)}&lang=pt-PT` : null);
  }, [exerciseIdx, exercises]);

  useEffect(() => {
    if (!recording && mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
  }, [recording, mediaStream]);

  async function loadExerciseSet(selectedTheme) {
    try {
      const res = await axios.post(`${API_URL}/api/exercise_set`, { profile, theme: selectedTheme });
      setExerciseSetId(res.data.exerciseSetId || null);
      setExercises(res.data.exercises || []);
      setExerciseIdx(0);
    } catch (err) {
      console.error("❌ Failed to load exercises", err);
      setExercises([]);
    }
  }

  async function handleRecord() {
    setRecording(true);
    setTranscript("");
    setFeedback("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setMediaStream(stream);
    mediaRecorderRef.current = new MediaRecorder(stream);
    const chunks = [];

    mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "audio.webm");
      formData.append("profile", profile);
      const ex = exercises[exerciseIdx];
      const currentExerciseId = ex.exerciseId || `missing-${exerciseIdx}`;
      formData.append("exerciseId", currentExerciseId);
      formData.append("exerciseSetId", exerciseSetId);
      formData.append("phrase", getExerciseText(ex));
      formData.append("ipa", getExerciseIPA(ex));
      formData.append("respelling", getRespelling(ex));

      try {
        const resp = await axios.post(`${API_URL}/api/analyze`, formData);
        setTranscript(resp.data.transcript);
        setFeedback(resp.data.feedback);
      } catch (err) {
        console.error("❌ Analyze error", err);
        setFeedback("Error during analysis.");
      }
      setRecording(false);
    };

    mediaRecorderRef.current.start();
  }

  function handleStop() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
  }

  function handleNext() {
    if (exerciseIdx < exercises.length - 1) {
      setExerciseIdx((prev) => prev + 1);
    }
  }

  function handlePrev() {
    if (exerciseIdx > 0) {
      setExerciseIdx((prev) => prev - 1);
    }
  }

  function handleThemeChange(e) {
    setTheme(e.target.value);
    localStorage.setItem("dizai-theme", e.target.value);
  }

  function handleReload() {
    loadExerciseSet(theme);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleReload();
    }
  }

  const ex = exercises[exerciseIdx];
  const exText = getExerciseText(ex);
  const exIPA = getExerciseIPA(ex);
  const exRespelling = getRespelling(ex);

  return (
    <div className="dizai-app">
      <header>
        <img src={logoUrl} alt="DizAi logo" style={{ height: 48 }} />
        <span style={{ fontSize: "2.2rem", fontWeight: 800 }}>DizAí v1.1</span>
        <input value={theme} onChange={handleThemeChange} onKeyDown={handleKeyDown} placeholder="Theme" />
      </header>

      <main>
        <button onClick={() => setProfile(profile === "Johan" ? "Petra" : "Johan")}>
          Switch to {profile === "Johan" ? "Petra" : "Johan"}
        </button>

        <h2>{exText}</h2>
        <div>
          {showIPA && <div>IPA: <strong>{exIPA}</strong></div>}
          {showRespelling && <div>Respelling: <strong>{exRespelling}</strong></div>}
          <label>
            <input type="checkbox" checked={showIPA} onChange={() => setShowIPA(!showIPA)} /> Show IPA
          </label>
          <label>
            <input type="checkbox" checked={showRespelling} onChange={() => setShowRespelling(!showRespelling)} /> Show respelling
          </label>
        </div>

        {audioUrl && <audio controls src={audioUrl} />}

        <div>
          <button onClick={handleRecord} disabled={recording}>{recording ? "Recording..." : "🎤 Record"}</button>
          {recording && <button onClick={handleStop}>Stop</button>}
        </div>

        <div>
          <strong>Transcript:</strong> {transcript}
        </div>
        <div style={{ color: getFeedbackColor(feedback) }}>{feedback}</div>

        <button onClick={handlePrev} disabled={exerciseIdx === 0}>Prev</button>
        <button onClick={handleNext}>Next</button>
        <button onClick={handleReload}>🔄 Load new questions</button>
      </main>
    </div>
  );
}
