const express = require("express");
const Paper = require("../models/Paper");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// GET /api/schedule
router.get("/", async (req, res) => {
  try {
    // Collect all papers with a schedule
    const papers = await Paper.find({ "schedule.date": { $ne: null } }).select("title authorName schedule");
    
    const schedule = papers.map(p => ({
      paperTitle: p.title,
      authorName: p.authorName,
      date: p.schedule.date,
      time: p.schedule.time,
      room: p.schedule.room
    }));

    console.log(`[API] GET /schedule | Found: ${schedule.length}`);
    res.json(schedule);
  } catch (error) {
    console.error(`[ERROR] Schedule fetch failed: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
