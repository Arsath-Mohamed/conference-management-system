const express = require("express");
const multer = require("multer");
const Paper = require("../models/Paper");
const User = require("../models/User");
const Review = require("../models/Review");
const Settings = require("../models/Settings");
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

// GET reviewers list
router.get("/reviewers", async (req, res) => {
  const reviewers = await User.find({ role: "reviewer" }).select("name email _id");
  res.json(reviewers);
});

// ================= CORE =================

// GET papers list
router.get("/", async (req, res) => {
  let papers;

  if (req.user.role === "admin" || req.user.role === "chair") {
    papers = await Paper.find().sort({ createdAt: -1 });
  } else if (req.user.role === "reviewer") {
    // Corrected for array
    papers = await Paper.find({ reviewerIds: req.user.id }).sort({ createdAt: -1 });
  } else {
    papers = await Paper.find({ authorId: req.user.id }).sort({ createdAt: -1 });
  }

  res.json(papers);
});

// GET single paper details including reviews
router.get("/:id", async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: "Paper not found" });

    // Fetch all reviews for this paper
    const reviews = await Review.find({ paperId: req.params.id }).sort({ createdAt: -1 });
    
    // Check access
    const isAuthor = paper.authorId === req.user.id;
    const isReviewer = paper.reviewerIds.includes(req.user.id);
    const isPowerUser = req.user.role === "admin" || req.user.role === "chair";

    if (!isAuthor && !isReviewer && !isPowerUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({
      paper,
      reviews: isPowerUser ? reviews : (isReviewer ? reviews.filter(r => r.reviewerId.toString() === req.user.id) : [])
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST new paper
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings || !settings.isConferenceAnnounced) {
      return res.status(403).json({ message: "Conference is not announced/submissions closed." });
    }
    
    if (settings.submissionDeadline && new Date() > new Date(settings.submissionDeadline)) {
      return res.status(403).json({ message: "Submission deadline has passed." });
    }

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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ASSIGN (Append to array)
router.put("/:id/assign", isChair, async (req, res) => {
  const { reviewerId } = req.body;

  const reviewer = await User.findById(reviewerId);
  if (!reviewer) return res.status(400).json({ message: "Invalid reviewer" });

  const paper = await Paper.findById(req.params.id);
  if (!paper) return res.status(404).json({ message: "Paper not found" });

  // Add only if not already assigned
  if (!paper.reviewerIds.includes(reviewerId)) {
    paper.reviewerIds.push(reviewerId);
    await paper.save();
  }

  res.json(paper);
});

// SCHEDULE
router.put("/:id/schedule", isChair, async (req, res) => {
  const { date, time, room } = req.body;
  const paper = await Paper.findByIdAndUpdate(req.params.id, {
    schedule: { date, time, room }
  }, { new: true });
  res.json(paper);
});

// SUBMIT REVIEW (Stored in Review model)
router.put("/:id/review", async (req, res) => {
  try {
    const { reviewComment, reviewRating, reviewDecision } = req.body;
    const paperId = req.params.id;

    const paper = await Paper.findById(paperId);
    if (!paper) return res.status(404).json({ message: "Paper not found" });

    if (!paper.reviewerIds.includes(req.user.id) && req.user.role !== "admin" && req.user.role !== "chair") {
      return res.status(403).json({ message: "Not authorized to review this paper." });
    }

    // Upsert review
    let review = await Review.findOne({ paperId, reviewerId: req.user.id });
    if (!review) {
      review = new Review({
        paperId,
        reviewerId: req.user.id,
        reviewerName: req.user.name
      });
    }

    review.rating = reviewRating;
    review.comment = reviewComment;
    review.decision = reviewDecision;
    review.createdAt = new Date();

    await review.save();
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// STATUS (Final verdict)
router.put("/:id/status", isChair, async (req, res) => {
  const { status } = req.body;
  const paper = await Paper.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.json(paper);
});

// DELETE
router.delete("/:id", isChair, async (req, res) => {
  await Review.deleteMany({ paperId: req.params.id });
  await Paper.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

module.exports = router;