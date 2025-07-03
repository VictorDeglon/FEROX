const WorkoutPlan = require('../models/WorkoutPlan');

exports.getAll = async (req, res) => {
  const plans = await WorkoutPlan.find();
  res.json(plans);
};

exports.getOne = async (req, res) => {
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
