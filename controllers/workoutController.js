const WorkoutPlan = require('../models/WorkoutPlan');

exports.getAll = async (req, res) => {
  const plans = await WorkoutPlan.find();
  res.json(plans);
};

exports.create = async (req, res) => {
  const plan = await WorkoutPlan.create(req.body);
  res.status(201).json(plan);
};
