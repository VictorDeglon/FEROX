const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profile: { type: Object, default: {} },
  stats: { type: Object, default: {} },
});

module.exports = mongoose.model('User', userSchema);
