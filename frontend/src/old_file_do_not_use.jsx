import React, { useState, useRef, useEffect } from "react";
import Header from "./Header";
import "./App.css";
import axios from "axios";

export default function App() {
  const [profile, setProfile] = useState("Johan");
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef();

  useEffect(() => {
    axios.get("https://dizai-v09.onrender.com/exercises").then((res) =>
      setExercises(res.data[profile])
    );
  }, [profile]);

  useEffect(() => {
    if (exercises.length)
      setAudioUrl(`/tts?text=${encodeURIComponent(exercises[exerciseIdx].text)}&type=pt-PT`);
  }, [exercises, exerciseIdx]);

  const handleRecord = async () => {
    setRecording(true);
    setTranscript("");
    setFeedback("");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new window.MediaRecorder(stream);
    let chunks = [];
    mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorderRef.current.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "audio.webm");
      formData.append("profile", profile);
      formData.append("exerciseId", exerciseIdx);
      const resp = await axios.post("/analyze", formData);
      setTranscript(resp.data.transcript);
      setFeedback(resp.data.feedback);
      setRecording(false);
    };
    mediaRecorderRef.current.start();
    setTimeout(() => {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    }, 3000);
  };

  if (!exercises.length) return <div className="loading">Loading...</div>;
  const ex = exercises[exerciseIdx];

  return (
    <div className="dizai-root">
      <Header />
      <div className="main-content">
        <button className="switch-profile" onClick={() => setProfile(profile === "Johan" ? "Petra" : "Johan")}>
          Switch to {profile === "Johan" ? "Petra" : "Johan"}
        </button>
        <h2>{ex.text}</h2>
        <div className="ipa-line">
          <span>IPA: </span>
          <span className="ipa">{ex.ipa}</span>
        </div>
        <audio controls src={audioUrl}></audio>
        <br />
        <button className="record-btn" onClick={handleRecord} disabled={recording}>
          {recording ? "Recording..." : "🎙️ Record"}
        </button>
        <div className="transcript">
          <b>Transcript:</b> {transcript}
        </div>
        <div className={`feedback ${feedback.startsWith("Perfect") ? "feedback-ok" : feedback.startsWith("Almost") ? "feedback-warn" : "feedback-err"}`}>
          {feedback}
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="nav-btn prev" disabled={exerciseIdx === 0} onClick={() => setExerciseIdx(exerciseIdx - 1)}>
            Prev
          </button>
          <button className="nav-btn next" disabled={exerciseIdx === exercises.length - 1} onClick={() => setExerciseIdx(exerciseIdx + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
