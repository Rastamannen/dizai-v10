// backend/v10/models/exerciseModels.js

const exerciseSets = new Map(); // Key: exerciseSetId, Value: ExerciseSet object

class ExerciseSet {
  constructor({ exerciseSetId, userId, exercises }) {
    this.exerciseSetId = exerciseSetId;
    this.userId = userId;
    this.exercises = exercises; // [{ exerciseId, text, ipa, respelling, audioUrl }]
    this.responses = {}; // Key: exerciseId, Value: Feedback object
  }

  addFeedback(exerciseId, feedback) {
    this.responses[exerciseId] = feedback;
  }

  getExercise(exerciseId) {
    return this.exercises.find(e => e.exerciseId === exerciseId);
  }

  toJSON() {
    return {
      exerciseSetId: this.exerciseSetId,
      userId: this.userId,
      exercises: this.exercises,
      responses: this.responses
    };
  }
}

module.exports = {
  exerciseSets,
  ExerciseSet
};
