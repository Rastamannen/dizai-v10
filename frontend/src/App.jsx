// App.jsx - DizAí v1.0 (med temat visat och knapp för manuell omladdning av övningar)

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

export default function App() {
  const [profile, setProfile] = useState("Johan");
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [exerciseSetId, setExerciseSetId] = useState(null);
  const [theme, setTheme] = useState("");
  const [feedback, setFeedback] = useState("");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);
  const mediaRecorderRef = useRef();

  useEffect(() => {
    loadExerciseSet();
  }, [profile]);

  useEffect(() => {
    if (!exercises.length) return;
    setTranscript("");
    setFeedback("");
    setAudioUrl(
      `${API_URL}/api/tts?text=${encodeURIComponent(
        exercises[exerciseIdx].text
      )}&lang=pt-PT`
    );
  }, [exerciseIdx, exercises]);

  useEffect(() => {
    if (!recording && mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
  }, [recording, mediaStream]);

  async function loadExerciseSet() {
    try {
      const res = await axios.get(`${API_URL}/api/exercise_set?profile=${profile}`);
      if (res.data.exerciseSetId !== exerciseSetId) {
        setExerciseSetId(res.data.exerciseSetId);
        setExercises(res.data.exercises);
        setExerciseIdx(0);
      }
      if (res.data.theme) {
        setTheme(res.data.theme);
      } else {
        setTheme("");
      }
    } catch (err) {
      setExercises([]);
      setTheme("");
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
      formData.append("exerciseId", exercises[exerciseIdx].exerciseId);
      formData.append("exerciseSetId", exerciseSetId);
      try {
        const resp = await axios.post(`${API_URL}/api/analyze`, formData);
        setTranscript(resp.data.transcript);
        setFeedback(resp.data.feedback);
      } catch (err) {
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

  function handleReload() {
    window.location.reload();
  }

  function renderTranscript() {
    const ex = exercises[exerciseIdx];
    if (!ex.transcript || !ex.highlight || !Array.isArray(ex.highlight)) return transcript;
    const words = transcript.split(/\s+/);
    return words.map((word, idx) =>
      ex.highlight.includes(idx) ? (
        <span key={idx} style={{ background: "#FFD580", color: "#D1495B", fontWeight: 700 }}>{word} </span>
      ) : (
        word + " "
      )
    );
  }

  if (!exercises.length) return <div className="loading">Loading...</div>;

  const ex = exercises[exerciseIdx];

  return (
    <div className="dizai-app">
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "18px 0 0 16px",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={logoUrl} alt="DizAi logo" style={{ height: 48, marginRight: 18 }} />
          <span style={{ fontSize: "2.2rem", color: "#0033A0", fontWeight: 800 }}>DizAí v1.0</span>
        </div>
        {theme && (
          <div style={{ fontSize: "1rem", color: "#444", marginTop: 4 }}>
            🎯 Active theme: <strong>{theme}</strong>
          </div>
        )}
      </header>

      <main style={{ padding: 20 }}>
        <button className="profile-btn" onClick={() => setProfile(profile === "Johan" ? "Petra" : "Johan")}>
          Switch to {profile === "Johan" ? "Petra" : "Johan"}
        </button>
        <h2 className="exercise-text">{ex.text}</h2>
        <div className="ipa">
          IPA: <span style={{ color: "#0033A0", fontWeight: 600 }}>{ex.ipa}</span>
        </div>
        <audio
          controls
          src={audioUrl}
          style={{ width: "100%", background: "#F6F9FF", margin: "18px 0 16px 0" }}
        ></audio>

        <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
          <button
            className="record-btn"
            onClick={handleRecord}
            disabled={recording}
            style={{ background: recording ? "#D49F1B" : "#0033A0", color: "#fff", fontWeight: 700 }}
          >
            {recording ? "Recording..." : "🎤 Record"}
          </button>
          {recording && (
            <button className="stop-btn" onClick={handleStop} style={{ background: "#D1495B", color: "#fff" }}>
              Stop
            </button>
          )}
        </div>

        <div className="transcript">
          <span style={{ fontWeight: 700, color: "#0033A0" }}>Transcript:</span>{" "}
          {transcript ? renderTranscript() : ""}
        </div>
        <div
          className="feedback"
          style={{ fontWeight: 700, fontSize: "1.2rem", color: getFeedbackColor(feedback), margin: "10px 0" }}
        >
          {feedback}
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <button
            className="nav-btn"
            disabled={exerciseIdx === 0}
            onClick={handlePrev}
            style={{ background: "#8E9775", color: "#fff", fontWeight: 700 }}
          >
            Prev
          </button>
          <button
            className="nav-btn"
            onClick={handleNext}
            style={{ background: "#0033A0", color: "#fff", fontWeight: 700 }}
          >
            Next
          </button>
        </div>

        <div style={{ marginTop: 40, textAlign: "center" }}>
          <button onClick={handleReload} style={{ padding: "8px 16px", fontSize: "16px" }}>
            🔄 Load new questions
          </button>
        </div>
      </main>
    </div>
  );
}
