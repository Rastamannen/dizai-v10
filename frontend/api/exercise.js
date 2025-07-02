// frontend/v10/api/exercise.js

import axios from "axios";

const API_URL = "http://localhost:3001/api"; // Anpassa vid deploy

export const getExerciseSet = async (exerciseSetId) => {
  const res = await axios.get(`${API_URL}/exercise_set/${exerciseSetId}`);
  return res.data;
};

export const postFeedback = async ({ exerciseSetId, exerciseId, userId, feedback }) => {
  return await axios.post(`${API_URL}/feedback`, {
    exerciseSetId,
    exerciseId,
    userId,
    feedback
  });
};
