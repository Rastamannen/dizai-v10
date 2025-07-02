// frontend/src/App.jsx

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./index.css";
import logoUrl from "./assets/DizAi_FullLogo.svg";

const API_URL =
  window.location.hostname.includes("onrender.com")
    ? "https://dizai-v09.onrender.com/api"
    : "http://localhost:3001/api";

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
  const [userId, setUserId] = useState("johan");
  const [exerciseSetId, setExerciseSetId] = useState("set-001");
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);
  const mediaRecorderRef = useRef();

  const currentExercise = exercises[exerciseIdx];

  // Fetch exercise set
  useEffect(() => {
    axios
      .get(`${API_URL}/exercise_set`, {
        params: {
          userId,
          exerciseSetId
        }
      })
      .then((res) => setExercises(res.data.exercises || []))
      .catch(() => setExercises([]));
  }, [userId, exerciseSetId]);

  // Update TTS
  useEffect(() => {
    setTranscript("");
    setFeedback("");
    if (exercises.length) {
      setAudioUrl(
        `${API_URL.replace("/api", "")}/tts?text=${encodeURIComponent(currentExercise.text)}&type=pt-PT`
      );
    }
  }, [exercises, exerciseIdx]);

  // Stop mic after recording
  useEffect(() => {
    if (!recording && mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
  }, [recording, mediaStream]);

  const handleRecord = async () => {
    setRecording(true);
    setTranscript("");
    setFeedback("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setMediaStream(stream);
    mediaRecorderRef.current = new window.MediaRecorder(stream);
    let chunks = [];
    mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "audio.webm");
      formData.append("userId", userId);
      formData.append("exerciseId", currentExercise.exerciseId);
      formData.append("exerciseSetId", exerciseSetId);
      try {
        const resp = await axios.post(`${API_URL}/feedback`, formData);
        setTranscript(resp.data.transcript || "");
        setFeedback(resp.data.feedback || "");
        setRecording(false);
      } catch (err) {
        setFeedback("Error during analysis.");
        setRecording(false);
      }
    };
    mediaRecorderRef.current.start();
  };

  const handleStop = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const renderTranscript = () => {
    const words = transcript.split(/\s+/);
    const highlights = currentExercise.highlight || [];
    return words.map((word, idx) =>
      highlights.includes(idx) ? (
        <span
          key={idx}
          style={{ background: "#FFD580", color: "#D1495B", fontWeight: 700 }}
        >
          {word + " "}
        </span>
      ) : (
        word + " "
      )
    );
  };

  if (!exercises.length) return <div className="loading">Loading...</div>;

  return (
    <div className="dizai-app">
      <header style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 0 0 16px" }}>
        <img src={logoUrl} alt="DizAi logo" style={{ height: 48, marginRight: 18 }} />
        <span style={{ fontSize: "2.2rem", color: "#0033A0", fontWeight: 800 }}>
          DizAí v1.0
        </span>
      </header>

      <main style={{ padding: 20 }}>
        <button onClick={() => setUserId(userId === "johan" ? "petra" : "johan")}>
          Switch to {userId === "johan" ? "Petra" : "Johan"}
        </button>
        <h2 className="exercise-text">{currentExercise.text}</h2>
        <div className="ipa">IPA: <span style={{ color: "#0033A0", fontWeight: 600 }}>{currentExercise.ipa}</span></div>
        <audio controls src={audioUrl} style={{ width: "100%", margin: "18px 0" }} />
        <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
          <button onClick={handleRecord} disabled={recording} style={{ background: recording ? "#D49F1B" : "#0033A0", color: "#fff", fontWeight: 700 }}>
            {recording ? "Recording..." : "🎙️ Record"}
          </button>
          {recording && (
            <button onClick={handleStop} style={{ background: "#D1495B", color: "#fff" }}>
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
          style={{
            fontWeight: 700,
            fontSize: "1.2rem",
            color: getFeedbackColor(feedback),
            margin: "10px 0",
          }}
        >
          {feedback}
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <button
            disabled={exerciseIdx === 0}
            onClick={() => setExerciseIdx(exerciseIdx - 1)}
            style={{ background: "#8E9775", color: "#fff", fontWeight: 700 }}
          >
            Prev
          </button>
          <button
            disabled={exerciseIdx === exercises.length - 1}
            onClick={() => setExerciseIdx(exerciseIdx + 1)}
            style={{ background: "#0033A0", color: "#fff", fontWeight: 700 }}
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
}
