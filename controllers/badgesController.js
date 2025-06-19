const Badge = require('../models/Badge');

exports.getAll = async (req, res) => {
  const badges = await Badge.find();
  res.json(badges);
};

exports.unlock = async (req, res) => {
  const badge = await Badge.findByIdAndUpdate(
    req.params.id,
    { isEarned: true },
    { new: true }
  );
  res.json(badge);
};
