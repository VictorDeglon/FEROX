const WorkoutPlan = require('../models/WorkoutPlan');

const sampleWorkouts = [
  {
    _id: 'sample1',
    name: 'Sample Strength',
    description: 'A quick strength routine',
    duration: 30,
    difficulty: 'Easy',
    type: 'Strength',
  },
  {
    _id: 'sample2',
    name: 'Sample Cardio',
    description: 'Heart pumping cardio blast',
    duration: 45,
    difficulty: 'Medium',
    type: 'Cardio',
  },
  {
    _id: 'sample3',
    name: 'Sample Mobility',
    description: 'Stretch and recover',
    duration: 20,
    difficulty: 'Hard',
    type: 'Mobility',
  },
];

exports.getAll = async (req, res) => {
  let plans = await WorkoutPlan.find();
  if (!plans.length) plans = sampleWorkouts;
  res.json(plans);
};

exports.getOne = async (req, res) => {
  if (req.params.id.startsWith('sample')) {
    const plan = sampleWorkouts.find((p) => p._id === req.params.id);
    if (plan) return res.json(plan);
  }
  const plan = await WorkoutPlan.findById(req.params.id);
  if (!plan) {
    return res.status(404).json({ message: 'Not found' });
  }
  res.json(plan);
};

exports.create = async (req, res) => {
  const plan = await WorkoutPlan.create(req.body);
  res.status(201).json(plan);
};
