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

// GET papers list
router.get("/", async (req, res) => {
  try {
    let papers;
    const userId = req.user.id;

    if (req.user.role === "admin" || req.user.role === "chair") {
      // Chairs see all papers + how many reviews they have
      const rawPapers = await Paper.find().populate("conferenceId", "name").sort({ createdAt: -1 }).lean();
      papers = await Promise.all(rawPapers.map(async p => {
        const reviewCount = await Review.countDocuments({ paperId: p._id });
        return { ...p, reviewCount };
      }));
    } else if (req.user.role === "reviewer") {
      // Reviewers see assigned papers + if they've reviewed them
      const rawPapers = await Paper.find({ reviewerIds: userId }).populate("conferenceId", "name").sort({ createdAt: -1 }).lean();
      papers = await Promise.all(rawPapers.map(async p => {
        const myReview = await Review.findOne({ paperId: p._id, reviewerId: userId });
        // Blind Review: Hide author name in list
        delete p.authorName;
        delete p.authorId;
        return { 
          ...p, 
          isReviewed: !!myReview,
          reviewDecision: myReview?.decision,
          reviewRating: myReview?.rating
        };
      }));
    } else {
      // Authors see their own papers
      papers = await Paper.find({ authorId: userId }).populate("conferenceId", "name").sort({ createdAt: -1 });
    }

    res.json(papers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single paper details (Anonymized for Reviewers)
router.get("/:id", async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id).populate("conferenceId", "name topics").lean();
    if (!paper) return res.status(404).json({ message: "Paper not found" });

    const reviews = await Review.find({ paperId: req.params.id }).sort({ createdAt: -1 });
    
    // Authorization (Force toString() for safe comparison)
    const isAuthor = paper.authorId.toString() === req.user.id;
    const isReviewer = paper.reviewerIds.some(id => id.toString() === req.user.id);
    const isPowerUser = req.user.role === "admin" || req.user.role === "chair";

    if (!isAuthor && !isReviewer && !isPowerUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Blind Review Logic: Hide Author details from Reviewers
    if (isReviewer && !isPowerUser) {
      delete paper.authorName;
      delete paper.authorId;
    }

    let resultReviews = [];
    if (isPowerUser) {
      resultReviews = reviews; // Chairs see everything
    } else if (isReviewer) {
      resultReviews = reviews.filter(r => r.reviewerId.toString() === req.user.id); // Reviewers see their own
    } else if (isAuthor && paper.status !== "submitted" && paper.status !== "under_review") {
      // Authors see anonymized reviews ONLY after status is reviewed/accepted/rejected
      resultReviews = reviews.map((r, index) => ({
        _id: r._id,
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
    const { title, abstract, conferenceId, topics } = req.body;
    
    if (!conferenceId) {
      return res.status(400).json({ message: "Conference ID is required." });
    }

    const paper = new Paper({
      title,
      abstract,
      conferenceId,
      topics: Array.isArray(topics) ? topics : (topics ? topics.split(',') : []),
      authorId: req.user.id,
      authorName: req.user.name,
      file: req.file?.filename,
      status: "submitted"
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

// GET reviewers list
router.get("/reviewers/list", isChair, async (req, res) => {
  const reviewers = await User.find({ role: "reviewer" }).select("name email _id");
  res.json(reviewers);
});

// ASSIGN Reviewer
router.put("/:id/assign", isChair, async (req, res) => {
  const { reviewerId } = req.body;
  const reviewer = await User.findById(reviewerId);
  if (!reviewer) return res.status(400).json({ message: "Invalid reviewer" });

  const paper = await Paper.findById(req.params.id);
  if (!paper) return res.status(404).json({ message: "Paper not found" });

  if (!paper.reviewerIds.some(id => id.toString() === reviewerId)) {
    paper.reviewerIds.push(reviewerId);
    
    // Update status to under_review if it was submitted
    if (paper.status === "submitted") {
      paper.status = "under_review";
    }
    
    await paper.save();
    
    // Trigger Notification
    await Notification.create({
      userId: reviewerId,
      message: `You have been assigned to review: ${paper.title}`,
      link: `/pages/paper-detail.html?id=${paper._id}`
    });
  } else {
    return res.status(400).json({ message: "Reviewer already assigned" });
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

    if (!paper.reviewerIds.some(id => id.toString() === req.user.id) && req.user.role !== "admin" && req.user.role !== "chair") {
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
    
    // Check if ALL reviewers have submitted
    const reviewCount = await Review.countDocuments({ paperId });
    if (reviewCount >= paper.reviewerIds.length) {
      paper.status = "reviewed";
      await paper.save();
    }

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

// SUBMIT REBUTTAL (Author only)
router.put("/:id/rebuttal", async (req, res) => {
  try {
    const { content, reviewerId } = req.body;
    const paper = await Paper.findById(req.params.id);
    
    if (!paper) return res.status(404).json({ message: "Paper not found" });
    if (paper.authorId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the author can submit a rebuttal." });
    }

    paper.rebuttals.push({
      reviewerId,
      content,
      createdAt: new Date()
    });

    await paper.save();

    // Notify Reviewer
    await Notification.create({
      userId: reviewerId,
      message: `Author has submitted a rebuttal for: ${paper.title}`,
      link: `/pages/paper-detail.html?id=${paper._id}`
    });

    res.json({ message: "Rebuttal submitted", paper });
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