// frontend/v10/components/FeedbackPanel.jsx

import React from "react";

const FeedbackPanel = ({ feedback }) => {
  if (!feedback) return null;
  return (
    <div style={{ marginTop: 16, padding: 12, background: "#eef", borderRadius: 8 }}>
      <p><strong>Feedback:</strong> {feedback.text}</p>
      <p><strong>Transcript:</strong> {feedback.transcript}</p>
      <p><strong>IPA:</strong> {feedback.ipa}</p>
      <p><strong>Errors:</strong> {feedback.errors?.join(", ")}</p>
    </div>
  );
};

export default FeedbackPanel;
