const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const workoutsRouter = require('./routes/workouts');
const progressRouter = require('./routes/progress');
const badgesRouter = require('./routes/badges');
const authRouter = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ferox';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use('/api/workouts', workoutsRouter);
app.use('/api/progress', progressRouter);
app.use('/api/badges', badgesRouter);
app.use('/api/auth', authRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
