const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  streaks: Number,
  hoursTrained: Number,
  focusDistribution: Object,
});

module.exports = mongoose.model('Progress', progressSchema);
