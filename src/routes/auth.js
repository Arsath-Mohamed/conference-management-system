const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "secret123";
// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Security Patch: Prevent privilege escalation during registration
    const allowedRoles = ["author", "reviewer"];
    const finalRole = allowedRoles.includes(role) ? role : "author";
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: finalRole
    });
    
    await user.save();
    
    res.status(201).json({ 
      message: "User registered successfully", 
      user: { id: user._id, name: user.name, email: user.email, role: user.role } 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password, roleGroup } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    // Role restriction
    if (roleGroup === "admin") {
      if (user.role !== "admin" && user.role !== "chair") {
        return res.status(403).json({ message: "This login is for administrators only." });
      }
    } else if (roleGroup === "user") {
      if (user.role === "admin" || user.role === "chair") {
        return res.status(403).json({ message: "Administrators must use the executive login portal." });
      }
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      SECRET,
      { expiresIn: "7d" }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
