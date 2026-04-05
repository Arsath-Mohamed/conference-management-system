const express = require("express");
const Conference = require("../models/Conference");
const { auth, isChair } = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// GET all conferences
router.get("/", async (req, res) => {
  try {
    const conferences = await Conference.find().sort({ createdAt: -1 });
    console.log(`[API] GET /conferences | Results: ${conferences.length}`);
    res.json({ success: true, data: conferences || [] });
  } catch (error) {
    console.error(`[ERROR] Conferences fetch failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET single conference
router.get("/:id", async (req, res) => {
  try {
    const conference = await Conference.findById(req.params.id);
    if (!conference) return res.status(404).json({ message: "Conference not found" });
    res.json(conference);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create conference (Chair/Admin only)
router.post("/", isChair, async (req, res) => {
  try {
    const { name, description, topics, startDate, endDate } = req.body;
    const conference = new Conference({
      name,
      description,
      topics,
      startDate,
      endDate
    });
    await conference.save();
    res.status(201).json(conference);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
