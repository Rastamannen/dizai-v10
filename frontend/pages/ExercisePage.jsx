// frontend/v10/pages/ExercisePage.jsx

import React, { useState, useEffect } from "react";
import { getExerciseSet, postFeedback } from "../api/exercise";
import FeedbackPanel from "../components/FeedbackPanel";
import useExerciseFlow from "../hooks/useExerciseFlow";

const ExercisePage = ({ userId = "johan", exerciseSetId = "ex-001" }) => {
  const [exerciseSet, setExerciseSet] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const { currentExercise, isLast, goNext } = useExerciseFlow(exerciseSet, currentIndex);

  useEffect(() => {
    getExerciseSet(exerciseSetId).then((data) => setExerciseSet(data));
  }, [exerciseSetId]);

  const handleSubmit = () => {
    const fakeFeedback = {
      text: "Incorrect pronunciation of final syllable.",
      ipa: currentExercise.ipa,
      transcript: currentExercise.text,
      errors: ["final phoneme"]
    };
    postFeedback({
      exerciseSetId,
      exerciseId: currentExercise.exerciseId,
      userId,
      feedback: fakeFeedback
    }).then(() => setFeedback(fakeFeedback));
  };

  const handleNext = () => {
    setFeedback(null);
    goNext();
    setCurrentIndex((prev) => prev + 1);
  };

  if (!exerciseSet) return <div>Loading...</div>;
  if (!currentExercise) return <div>All exercises complete!</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>DizAí v1.0 – European Portuguese</h1>
      <p><strong>User:</strong> {userId}</p>
      <p><strong>Exercise:</strong> {currentExercise.text}</p>
      <p><strong>IPA:</strong> {currentExercise.ipa}</p>
      <p><strong>Respelling:</strong> {currentExercise.respelling}</p>
      <audio controls src={currentExercise.audioUrl}></audio>

      {!feedback ? (
        <button onClick={handleSubmit}>Submit Answer</button>
      ) : (
        <>
          <FeedbackPanel feedback={feedback} />
          {!isLast && <button onClick={handleNext}>Next</button>}
        </>
      )}
    </div>
  );
};

export default ExercisePage;
