const express = require("express");
const multer = require("multer");
const Paper = require("../models/Paper");
const User = require("../models/User");
const Review = require("../models/Review");
const Notification = require("../models/Notification");
const Settings = require("../models/Settings");
const { auth, isChair } = require("../middleware/auth");
const { sendEmail } = require("../utils/mailer");

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

router.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl} | User: ${req.user.name} (${req.user.role})`);
  next();
});

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
      // Authors see their own papers. Admin/Chair can explicitly filter if needed.
      const authorFilter = (req.user.role === "admin" || req.user.role === "chair") 
        ? (req.query.authorId || userId) 
        : userId;
      papers = await Paper.find({ authorId: authorFilter }).populate("conferenceId", "name").sort({ createdAt: -1 });
    }

    console.log(`[API] GET /papers | User: ${req.user.name} | Results: ${papers.length}`);
    res.json({ success: true, data: papers || [] });
  } catch (error) {
    console.error(`[ERROR] Papers fetch failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
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
        comments: r.comments,
        recommendation: r.recommendation,
        reviewerName: `Reviewer #${index + 1}`, // Anonymize
        createdAt: r.createdAt
      }));
    }

    console.log(`[API] GET /papers/${req.params.id} | Found: ${!!paper}`);
    res.json({ success: true, data: { paper, reviews: resultReviews } });
  } catch (error) {
    console.error(`[ERROR] Paper detail failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
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
      status: "pending"
    });

    await paper.save();
    
    // 🔥 Trigger Email to Author on Submission
    const author = await User.findById(req.user.id);
    if (author) {
      await sendEmail(
        author.email,
        `Paper Submission Received: ${title}`,
        `Your paper "${title}" has been successfully submitted to the Conference Management System. Our experts will review it soon.`
      );
    }

    console.log(`[API] POST /papers | Title: ${title}`);
    res.json({ success: true, data: paper });
  } catch (error) {
    console.error(`[ERROR] Paper submission failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
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
    
    res.json({ success: true, message: "Final camera-ready version uploaded successfully.", data: paper });
  } catch (error) {
    console.error(`[ERROR] Paper final upload failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET reviewers list
router.get("/reviewers/list", isChair, async (req, res) => {
  try {
    const reviewers = await User.find({ role: "reviewer" }).select("name email _id");
    res.json({ success: true, data: reviewers || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
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
    
    // Status remains pending until decision
    
    await paper.save();
    
    // Trigger Notification
    await Notification.create({
      userId: reviewerId,
      message: `You have been assigned to review: ${paper.title}`,
      link: `/pages/paper-detail.html?id=${paper._id}`
    });

    // 🔥 Trigger Email Notification
    await sendEmail(
      reviewer.email,
      `New Review Assignment: ${paper.title}`,
      `You have been assigned to review the paper: ${paper.title}. Login to the CMS to start your review.`
    );
  } else {
    return res.status(400).json({ success: false, message: "Reviewer already assigned" });
  }

  res.json({ success: true, data: paper });
});

// SCHEDULE Presentation
router.put("/:id/schedule", isChair, async (req, res) => {
  try {
    const { date, time, room } = req.body;
    const paper = await Paper.findByIdAndUpdate(req.params.id, {
      schedule: { date, time, room }
    }, { new: true });
    res.json({ success: true, data: paper });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
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
    review.comments = reviewComment || "";
    review.recommendation = reviewDecision;
    review.createdAt = new Date();

    await review.save();
    
    // Status remains pending until final decision
    const reviewCount = await Review.countDocuments({ paperId });
    if (reviewCount >= paper.reviewerIds.length) {

      // 🔥 Trigger Email to Author
      const author = await User.findById(paper.authorId);
      if (author) {
        await sendEmail(
          author.email,
          `Paper Status Update: Reviewed`,
          `Great news! All reviews for your paper "${paper.title}" have been submitted. You can now view them and submit a rebuttal if needed.`
        );
      }
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
    
    console.log(`[API] PUT /review | Paper: ${paper.title} | Reviewer: ${req.user.name}`);
    res.json({ success: true, data: review });
  } catch (error) {
    console.error(`[ERROR] Review submission failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
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

    console.log(`[API] PUT /rebuttal | Paper: ${paper.title}`);
    res.json({ success: true, message: "Rebuttal submitted", data: paper });
  } catch (error) {
    console.error(`[ERROR] Rebuttal failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/papers/:id/decision
router.put("/:id/decision", isChair, async (req, res) => {
  try {
    const { decision } = req.body; // "accepted", "rejected", or "revisions"
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: "Paper not found" });

    // 1. Fetch all reviews for this paper
    const reviews = await Review.find({ paperId: req.params.id });
    
    // 2. Calculate Stats
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2) 
      : 0;
    
    const summary = {
      accept: reviews.filter(r => r.recommendation === "accept").length,
      reject: reviews.filter(r => r.recommendation === "reject").length,
      revision: reviews.filter(r => r.recommendation === "revision").length
    };

    // 3. Update Paper
    paper.status = decision;
    const verdictLabel = decision.toUpperCase();
    paper.conclusion = `Average Rating: ${avgRating}. Verdicts: ${summary.accept} Accept, ${summary.reject} Reject, ${summary.revisions} Revision.`;
    paper.decidedAt = new Date();

    console.log(`[STATUS] Paper: ${paper.title} | New Status: ${decision}`);
    await paper.save();

    // 4. Notify Author
    const author = await User.findById(paper.authorId);
    await Notification.create({
      userId: paper.authorId,
      message: `Final decision for your paper "${paper.title}": ${verdictLabel}`,
      link: `/pages/paper-detail.html?id=${paper._id}`
    });

    // 🔥 Trigger Email Notification
    if (author) {
      let emailSubject = `Final Decision: ${paper.title}`;
      let emailText = `A final decision has been made for your paper "${paper.title}". Status: ${verdictLabel}. Please login to the CMS for more details.`;

      if (decision === "revision") {
        emailSubject = `Revision Requested: ${paper.title}`;
        emailText = `The reviewers have requested revisions for your paper "${paper.title}". Please review the feedback and submit your updated manuscript soon.`;
      }

      await sendEmail(author.email, emailSubject, emailText);
    }

    // 5. Response
    res.json({
      success: true,
      message: "Decision finalized",
      data: {
        paper,
        stats: {
          averageRating: avgRating,
          totalReviews,
          decisionSummary: summary
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE Paper
router.delete("/:id", isChair, async (req, res) => {
  await Review.deleteMany({ paperId: req.params.id });
  await Paper.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

module.exports = router;