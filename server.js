const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

// Absolute path for uploads
const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath);

// Middleware
app.use(express.json());
app.use(cors());

// Serve Static Files
app.use(express.static(path.join(__dirname, "frontend")));
app.use("/uploads", express.static(uploadsPath));

// API Routes
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/papers", require("./src/routes/papers"));
app.use("/api/users", require("./src/routes/users"));
app.use("/api/settings", require("./src/routes/settings"));
app.use("/api/notifications", require("./src/routes/notifications"));

// Updated Catch-all: ONLY for non-file navigational routes
app.get("*", (req, res) => {
  // If the request is for /api or has a file extension, don't serve index.html (it's a 404)
  if (req.url.startsWith('/api') || req.url.includes('.')) {
    return res.status(404).json({ message: "Not Found" });
  }
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log("Server running on " + PORT));
  })
  .catch(err => console.log("MongoDB error:", err));
