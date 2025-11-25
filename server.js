const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// --- SCHEMAS ---
const userSchema = new mongoose.Schema({
  username: String,
});

const exerciseSchema = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date,
});

const User = mongoose.model("users", userSchema);
const Exercise = mongoose.model("exercises", exerciseSchema);

// --- ROUTES ---

// Create new user
app.post("/api/users", async (req, res) => {
  const user = new User({ username: req.body.username });
  await user.save();
  res.json({ username: user.username, _id: user._id });
});

// Get all users
app.get("/api/users", async (req, res) => {
  const users = await User.find({}, "username _id");
  res.json(users);
});

// Add exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  let { description, duration, date } = req.body;
  const userId = req.params._id;

  const user = await User.findById(userId);
  if (!user) return res.json({ error: "User not found" });

  if (!date) date = new Date();
  else date = new Date(date);

  const exercise = new Exercise({
    userId,
    description,
    duration: parseInt(duration),
    date,
  });

  await exercise.save();

  res.json({
    username: user.username,
    description,
    duration: parseInt(duration),
    date: exercise.date.toDateString(),
    _id: user._id,
  });
});

// Get log
app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const userId = req.params._id;

  const user = await User.findById(userId);
  if (!user) return res.json({ error: "User not found" });

  let filter = { userId };

  // Optional date filters
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  let exercises = Exercise.find(filter);

  // Optional limit
  if (limit) exercises = exercises.limit(parseInt(limit));

  const logs = await exercises;

  res.json({
    username: user.username,
    count: logs.length,
    _id: user._id,
    log: logs.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    })),
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "public/index.html"));
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Listening on port " + listener.address().port);
});
