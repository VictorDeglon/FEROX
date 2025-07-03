const mongoose = require('mongoose');

const workoutPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  longDescription: String,
  duration: Number,
  difficulty: String,
  calories: Number,
  type: String,
});

module.exports = mongoose.model('WorkoutPlan', workoutPlanSchema);
