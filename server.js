// server.js – FreeCodeCamp Exercise Tracker
require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve frontend files
app.use(express.static("public"));

// Index route (FCC compatible)
app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "index.html"));
});

// Connect to MongoDB
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/exercisetracker";

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// =============================
// SCHEMAS
// =============================

const exerciseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  log: [exerciseSchema],
});

const User = mongoose.model("User", userSchema);

// =============================
// ROUTES
// =============================

// CREATE USER
app.post("/api/users", async (req, res) => {
  try {
    const username = req.body.username;
    if (!username) return res.json({ error: "username required" });

    const user = new User({ username });
    await user.save();

    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    res.json({ error: "could not create user" });
  }
});

// GET ALL USERS
app.get("/api/users", async (req, res) => {
  const users = await User.find({}, "username _id");
  res.json(users);
});

// ADD EXERCISE
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const user = await User.findById(req.params._id);

    if (!user) return res.json({ error: "user not found" });

    const exerciseDate = date ? new Date(date) : new Date();
    if (exerciseDate.toString() === "Invalid Date")
      return res.json({ error: "Invalid Date" });

    const newExercise = {
      description,
      duration: Number(duration),
      date: exerciseDate,
    };

    user.log.push(newExercise);
    await user.save();

    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: user._id,
    });
  } catch (err) {
    res.json({ error: "could not add exercise" });
  }
});

// GET LOGS
app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { from, to, limit } = req.query;

    const user = await User.findById(req.params._id);
    if (!user) return res.json({ error: "user not found" });

    let logs = [...user.log];

    // FILTER DATE RANGE
    if (from) {
      const fromDate = new Date(from);
      logs = logs.filter((e) => e.date >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      logs = logs.filter((e) => e.date <= toDate);
    }

    // LIMIT
    if (limit) {
      logs = logs.slice(0, parseInt(limit));
    }

    // FORMAT DATE
    const formattedLogs = logs.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: formattedLogs.length,
      _id: user._id,
      log: formattedLogs,
    });
  } catch (err) {
    res.json({ error: "could not get logs" });
  }
});

// =============================
// START SERVER
// =============================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
