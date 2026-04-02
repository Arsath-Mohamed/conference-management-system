const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

// Create uploads folder if it doesn't exist
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static("frontend"));
app.use("/uploads", express.static("uploads"));

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB error:", err));

// Routes
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/papers", require("./src/routes/papers"));
app.use("/api/users", require("./src/routes/users"));
app.use("/api/settings", require("./src/routes/settings"));

// Frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on " + PORT));
