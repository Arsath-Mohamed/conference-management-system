const express = require("express");
const Review = require("../models/Review");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// GET reviews for a paper
router.get("/", async (req, res) => {
  try {
    const { paperId } = req.query;
    if (!paperId) return res.status(400).json({ message: "paperId is required" });

    console.log(`[API] GET /reviews for paper: ${paperId} | User: ${req.user.name}`);
    const reviews = await Review.find({ paperId }).sort({ createdAt: -1 });
    res.json({ success: true, data: reviews || [] });
  } catch (error) {
    console.error(`[ERROR] Reviews fetch failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
