const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Paper = require("../models/Paper");
const { auth, isAdmin } = require("../middleware/auth");

const router = express.Router();

// Apply auth middleware to ALL routes
router.use(auth);

// GET all users (Admin only)
router.get("/", isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create user (Admin only)
router.post("/", isAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || "author"
    });
    
    await user.save();
    
    res.status(201).json({ 
      message: "User created successfully", 
      user: { id: user._id, name: user.name, email: user.email, role: user.role } 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update user role (Admin only)
router.put("/:id/role", isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE user (Admin only)
router.delete("/:id", isAdmin, async (req, res) => {
  try {
    await Paper.deleteMany({ authorId: req.params.id });
    
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET reviewers list (for paper assignment)
router.get("/reviewers", auth, async (req, res) => {
  try {
    const reviewers = await User.find({ role: "reviewer" }).select("name email _id");
    res.json(reviewers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;