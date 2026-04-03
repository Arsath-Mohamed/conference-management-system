const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
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
app.use("/api/conferences", require("./src/routes/conferences"));

// Updated Catch-all: ONLY for non-file navigational routes
app.get("*", (req, res) => {
  // If the request is for /api or has a file extension, don't serve index.html (it's a 404)
  if (req.url.startsWith('/api') || req.url.includes('.')) {
    return res.status(404).json({ message: "Not Found" });
  }
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// Global Error Handler (Multer & General)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large (Max 5MB)" });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(500).json({ message: err.message || "Internal Server Error" });
  }
  next();
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log("Server running on " + PORT));
  })
  .catch(err => console.log("MongoDB error:", err));
