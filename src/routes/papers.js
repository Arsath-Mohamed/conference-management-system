const express = require("express");
const multer = require("multer");
const Paper = require("../models/Paper");
const User = require("../models/User");
const Review = require("../models/Review");
const Notification = require("../models/Notification");
const Settings = require("../models/Settings");
const { auth, isChair } = require("../middleware/auth");

const router = express.Router();

// upload configuration
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
    papers = await Paper.find({ reviewerIds: req.user.id }).sort({ createdAt: -1 });
  } else {
    papers = await Paper.find({ authorId: req.user.id }).sort({ createdAt: -1 });
  }

  res.json(papers);
});

// GET single paper details (Anonymized for Authors)
router.get("/:id", async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: "Paper not found" });

    const reviews = await Review.find({ paperId: req.params.id }).sort({ createdAt: -1 });
    
    // Authorization
    const isAuthor = paper.authorId === req.user.id;
    const isReviewer = paper.reviewerIds.includes(req.user.id);
    const isPowerUser = req.user.role === "admin" || req.user.role === "chair";

    if (!isAuthor && !isReviewer && !isPowerUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    let resultReviews = [];
    if (isPowerUser) {
      resultReviews = reviews; // Chairs see everything
    } else if (isReviewer) {
      resultReviews = reviews.filter(r => r.reviewerId.toString() === req.user.id); // Reviewers see their own
    } else if (isAuthor && paper.status !== "pending") {
      // Authors see anonymized reviews ONLY after decision
      resultReviews = reviews.map((r, index) => ({
        rating: r.rating,
        comment: r.comment,
        decision: r.decision,
        reviewerName: `Reviewer #${index + 1}`, // Anonymize
        createdAt: r.createdAt
      }));
    }

    res.json({ paper, reviews: resultReviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST new paper submission
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

// PUT upload final camera-ready version (Author only)
router.put("/:id/final", upload.single("file"), async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: "Paper not found" });

    if (paper.authorId !== req.user.id) {
      return res.status(403).json({ message: "Only the author can upload the final version." });
    }

    if (paper.status !== "accepted") {
      return res.status(403).json({ message: "Final version can only be uploaded for accepted papers." });
    }

    paper.finalFile = req.file?.filename;
    await paper.save();
    
    // Notify Chair/Admin
    const chairs = await User.find({ role: { $in: ["chair", "admin"] } });
    for (const chair of chairs) {
      await Notification.create({
        userId: chair._id,
        message: `Final camera-ready version uploaded for: ${paper.title}`,
        link: `/pages/paper-detail.html?id=${paper._id}`
      });
    }
    
    res.json({ message: "Final camera-ready version uploaded successfully.", paper });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ASSIGN Expert
router.put("/:id/assign", isChair, async (req, res) => {
  const { reviewerId } = req.body;
  const reviewer = await User.findById(reviewerId);
  if (!reviewer) return res.status(400).json({ message: "Invalid reviewer" });

  const paper = await Paper.findById(req.params.id);
  if (!paper) return res.status(404).json({ message: "Paper not found" });

  if (!paper.reviewerIds.includes(reviewerId)) {
    paper.reviewerIds.push(reviewerId);
    await paper.save();
    
    // Trigger Notification
    await Notification.create({
      userId: reviewerId,
      message: `You have been assigned to review: ${paper.title}`,
      link: `/pages/paper-detail.html?id=${paper._id}`
    });
  }

  res.json(paper);
});

// SCHEDULE Presentation
router.put("/:id/schedule", isChair, async (req, res) => {
  const { date, time, room } = req.body;
  const paper = await Paper.findByIdAndUpdate(req.params.id, {
    schedule: { date, time, room }
  }, { new: true });
  res.json(paper);
});

// SUBMIT REVIEW
router.put("/:id/review", async (req, res) => {
  try {
    const { reviewComment, reviewRating, reviewDecision } = req.body;
    const paperId = req.params.id;

    const paper = await Paper.findById(paperId);
    if (!paper) return res.status(404).json({ message: "Paper not found" });

    if (!paper.reviewerIds.includes(req.user.id) && req.user.role !== "admin" && req.user.role !== "chair") {
      return res.status(403).json({ message: "Not authorized to review this paper." });
    }

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
    
    // Notify Chairs
    const chairs = await User.find({ role: { $in: ["chair", "admin"] } });
    for (const chair of chairs) {
      await Notification.create({
        userId: chair._id,
        message: `New review submitted for: ${paper.title}`,
        link: `/pages/paper-detail.html?id=${paper._id}`
      });
    }
    
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// STATUS (Final Decision)
router.put("/:id/status", isChair, async (req, res) => {
  const { status } = req.body;
  const paper = await Paper.findByIdAndUpdate(req.params.id, { status }, { new: true });
  
  // Notify Author
  await Notification.create({
    userId: paper.authorId,
    message: `Final decision for your paper "${paper.title}": ${status.toUpperCase()}`,
    link: `/pages/paper-detail.html?id=${paper._id}`
  });
  
  res.json(paper);
});

// DELETE Paper
router.delete("/:id", isChair, async (req, res) => {
  await Review.deleteMany({ paperId: req.params.id });
  await Paper.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

module.exports = router;