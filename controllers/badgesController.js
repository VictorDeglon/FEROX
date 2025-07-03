const Badge = require('../models/Badge');

const sampleBadges = [
  {
    name: 'First Steps',
    description: 'Complete your first workout',
    unlockCondition: 'Finish 1 workout',
    isEarned: true,
  },
  {
    name: 'On a Roll',
    description: 'Train three days in a row',
    unlockCondition: '3 day streak',
    isEarned: false,
  },
  {
    name: 'Dedicated',
    description: 'Complete 10 total workouts',
    unlockCondition: '10 workouts',
    isEarned: false,
  },
];

exports.getAll = async (req, res) => {
  let badges = await Badge.find();
  if (!badges.length) badges = sampleBadges;
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
