const Progress = require('../models/Progress');

exports.get = async (req, res) => {
  let progress = await Progress.findOne({ userId: req.params.userId });
  if (!progress) {
    progress = {
      streaks: 0,
      hoursTrained: 0,
      focusDistribution: { Strength: 1, Cardio: 1, Mobility: 1 },
    };
  }
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
