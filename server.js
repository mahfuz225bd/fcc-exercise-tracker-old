// ============================================
// Exercise Tracker - FreeCodeCamp Project
// Backend API Server
// ============================================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static("public"));

// ============================================
// MONGODB CONNECTION
// ============================================
mongoose
  .connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/exercise-tracker",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ============================================
// MONGOOSE SCHEMAS AND MODELS
// ============================================

// User Schema - stores username only
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
});

const User = mongoose.model("User", userSchema);

// Exercise Schema - stores exercise data linked to user
const exerciseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

// ============================================
// API ROUTES
// ============================================

// Root route - serves the HTML interface
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --------------------------------------------
// POST /api/users
// Creates a new user
// Body: { username: string }
// Returns: { username: string, _id: string }
// --------------------------------------------
app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;

    // Validate username
    if (!username) {
      return res.json({ error: "Username is required" });
    }

    // Create new user
    const newUser = new User({ username });
    const savedUser = await newUser.save();

    // Return exact format required by FCC tests
    res.json({
      username: savedUser.username,
      _id: savedUser._id.toString(),
    });
  } catch (err) {
    // Handle duplicate username error
    if (err.code === 11000) {
      return res.json({ error: "Username already exists" });
    }
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Error creating user" });
  }
});

// --------------------------------------------
// GET /api/users
// Gets all users in the database
// Returns: Array of { username: string, _id: string }
// --------------------------------------------
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}).select("username _id");

    // Return array of users with exact format
    res.json(
      users.map((user) => ({
        username: user.username,
        _id: user._id.toString(),
      }))
    );
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Error fetching users" });
  }
});

// --------------------------------------------
// POST /api/users/:_id/exercises
// Adds an exercise for a specific user
// URL params: _id (user's MongoDB ObjectId)
// Body: { description: string, duration: number, date: string (optional) }
// Returns: { username: string, description: string, duration: number, date: string, _id: string }
// --------------------------------------------
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;

    // Validate required fields
    if (!description || !duration) {
      return res.json({ error: "Description and duration are required" });
    }

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Use provided date or current date if not provided
    const exerciseDate = date ? new Date(date) : new Date();

    // Create new exercise
    const newExercise = new Exercise({
      userId: user._id,
      description: description,
      duration: Number(duration),
      date: exerciseDate,
    });

    await newExercise.save();

    // Return exact format required by FCC tests
    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: user._id.toString(),
    });
  } catch (err) {
    console.error("Error adding exercise:", err);
    res.status(500).json({ error: "Error adding exercise" });
  }
});

// --------------------------------------------
// GET /api/users/:_id/logs
// Gets exercise log for a specific user with optional filtering
// URL params: _id (user's MongoDB ObjectId)
// Query params: from (date), to (date), limit (number)
// Returns: { username: string, count: number, _id: string, log: Array }
// --------------------------------------------
app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Build query filter for exercises
    let filter = { userId: user._id };

    // Add date range filters if provided
    if (from || to) {
      filter.date = {};
      if (from) {
        filter.date.$gte = new Date(from);
      }
      if (to) {
        filter.date.$lte = new Date(to);
      }
    }

    // Create query
    let exercisesQuery = Exercise.find(filter).sort({ date: 1 });

    // Apply limit if provided
    if (limit) {
      exercisesQuery = exercisesQuery.limit(Number(limit));
    }

    const exercises = await exercisesQuery.exec();

    // Format log array - each item has description, duration, date (NO _id)
    const log = exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    }));

    // Return exact format required by FCC tests
    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id.toString(),
      log: log,
    });
  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({ error: "Error fetching logs" });
  }
});

// ============================================
// START SERVER
// ============================================
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Your app is listening on port " + listener.address().port);
  console.log("📝 Visit http://localhost:" + listener.address().port);
});
