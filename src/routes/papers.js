const express = require("express");
const multer = require("multer");
const Paper = require("../models/Paper");
const User = require("../models/User");
const { auth, isChair } = require("../middleware/auth");

const router = express.Router();

// upload
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF allowed"));
  }
});

router.use(auth);

// ✅ IMPORTANT: reviewers FIRST
router.get("/reviewers", async (req, res) => {
  const reviewers = await User.find({ role: "reviewer" }).select("name email _id");
  res.json(reviewers);
});


// ================= CORE =================

// GET papers
router.get("/", async (req, res) => {
  let papers;

  if (req.user.role === "admin" || req.user.role === "chair") {
    papers = await Paper.find().sort({ createdAt: -1 });
  } else if (req.user.role === "reviewer") {
    papers = await Paper.find({ reviewerId: req.user.id });
  } else {
    papers = await Paper.find({ authorId: req.user.id });
  }

  res.json(papers);
});

// POST
router.post("/", upload.single("file"), async (req, res) => {
  const { title, abstract } = req.body;

  const paper = new Paper({
    title,
    abstract,
    authorId: req.user.id,
    authorName: req.user.name,
    file: req.file?.filename,
    status: "pending"
  });

  await paper.save();
  res.json(paper);
});

// ASSIGN
router.put("/:id/assign", isChair, async (req, res) => {
  const { reviewerId } = req.body;

  const reviewer = await User.findById(reviewerId);
  if (!reviewer) return res.status(400).json({ message: "Invalid reviewer" });

  const paper = await Paper.findByIdAndUpdate(
    req.params.id,
    {
      reviewerId: reviewer._id,
      reviewerName: reviewer.name
    },
    { new: true }
  );

  res.json(paper);
});


// ✅ SCHEDULE (MAIN FIX)
router.put("/:id/schedule", isChair, async (req, res) => {
  const { date, time, room } = req.body;

  const paper = await Paper.findById(req.params.id);
  if (!paper) return res.status(404).json({ message: "Paper not found" });

  paper.schedule = { date, time, room };

  await paper.save();

  res.json(paper);
});

// ✅ STATUS (NEW: Accept/Reject)
router.put("/:id/status", isChair, async (req, res) => {
  const { status } = req.body;

  if (!["accepted", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const paper = await Paper.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  if (!paper) return res.status(404).json({ message: "Paper not found" });

  res.json(paper);
});


// DELETE
router.delete("/:id", isChair, async (req, res) => {
  await Paper.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

module.exports = router;