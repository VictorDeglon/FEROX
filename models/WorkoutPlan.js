const mongoose = require('mongoose');

const workoutPlanSchema = new mongoose.Schema({
  name: String,
  type: String,
  focusArea: String,
  days: Number,
  exercises: Array,
});

module.exports = mongoose.model('WorkoutPlan', workoutPlanSchema);
