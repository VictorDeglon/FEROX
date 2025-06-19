const Progress = require('../models/Progress');

exports.get = async (req, res) => {
  const progress = await Progress.findOne({ userId: req.params.userId });
  res.json(progress);
};

exports.update = async (req, res) => {
  const progress = await Progress.findOneAndUpdate(
    { userId: req.params.userId },
    req.body,
    { new: true, upsert: true }
  );
  res.json(progress);
};
