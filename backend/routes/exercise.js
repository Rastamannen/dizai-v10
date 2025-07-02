// backend/v10/routes/exercise.js

const express = require("express");
const router = express.Router();
const controller = require("../controllers/exerciseController");

router.post("/exercise_set", controller.createExerciseSet);
router.get("/exercise_set/:exerciseSetId", controller.getExerciseSet);
router.post("/feedback", controller.submitFeedback);

module.exports = router;
