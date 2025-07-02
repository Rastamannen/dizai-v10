// backend/v10/controllers/exerciseController.js

const { exerciseSets, ExerciseSet } = require("../models/exerciseModels");

exports.createExerciseSet = (req, res) => {
  const { exerciseSetId, userId, exercises } = req.body;
  if (!exerciseSetId || !userId || !Array.isArray(exercises)) {
    return res.status(400).json({ error: "Missing or invalid exercise set data" });
  }
  const set = new ExerciseSet({ exerciseSetId, userId, exercises });
  exerciseSets.set(exerciseSetId, set);
  res.json({ status: "ok", exerciseSetId });
};

exports.getExerciseSet = (req, res) => {
  const { exerciseSetId } = req.params;
  const set = exerciseSets.get(exerciseSetId);
  if (!set) {
    return res.status(404).json({ error: "Exercise set not found" });
  }
  res.json(set.toJSON());
};

exports.submitFeedback = (req, res) => {
  const { exerciseSetId, exerciseId, userId, feedback } = req.body;
  const set = exerciseSets.get(exerciseSetId);
  if (!set || set.userId !== userId) {
    return res.status(404).json({ error: "Exercise set not found or wrong user" });
  }
  set.addFeedback(exerciseId, feedback);
  res.json({ status: "feedback recorded" });
};
