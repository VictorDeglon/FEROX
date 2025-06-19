const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: String,
  description: String,
  unlockCondition: String,
  isEarned: { type: Boolean, default: false },
});

module.exports = mongoose.model('Badge', badgeSchema);
