const express = require("express");
const Conference = require("../models/Conference");
const Paper = require("../models/Paper");
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
    if (!conference) return res.status(404).json({ success: false, message: "Conference not found" });
    res.json({ success: true, data: conference });
  } catch (error) {
    console.error(`[ERROR] Conference fetch failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST create conference (Chair/Admin only)
router.post("/", isChair, async (req, res) => {
  try {
    const { name, description, topics, startDate, endDate, status } = req.body;
    if (!name || !description || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: "Name, description, start date, and end date are required." });
    }
    const conference = new Conference({
      name,
      description,
      topics: Array.isArray(topics) ? topics : (topics ? topics.split(",").map(t => t.trim()).filter(t => t) : []),
      startDate,
      endDate,
      status: status || "open"
    });
    await conference.save();
    console.log(`[API] POST /conferences | Created: ${name}`);
    res.status(201).json({ success: true, data: conference });
  } catch (error) {
    console.error(`[ERROR] Conference create failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT update conference (Chair/Admin only)
router.put("/:id", isChair, async (req, res) => {
  try {
    const { name, description, topics, startDate, endDate, status } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (topics !== undefined) update.topics = Array.isArray(topics) ? topics : topics.split(",").map(t => t.trim()).filter(t => t);
    if (startDate !== undefined) update.startDate = startDate;
    if (endDate !== undefined) update.endDate = endDate;
    if (status !== undefined) update.status = status;

    const conference = await Conference.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!conference) return res.status(404).json({ success: false, message: "Conference not found" });

    console.log(`[API] PUT /conferences/${req.params.id} | Updated`);
    res.json({ success: true, data: conference });
  } catch (error) {
    console.error(`[ERROR] Conference update failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE conference (Chair/Admin only)
router.delete("/:id", isChair, async (req, res) => {
  try {
    const conference = await Conference.findById(req.params.id);
    if (!conference) return res.status(404).json({ success: false, message: "Conference not found" });

    // Also remove papers linked to this conference
    const paperCount = await Paper.countDocuments({ conferenceId: req.params.id });
    if (paperCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${paperCount} paper(s) are linked to this conference. Remove them first.`
      });
    }

    await Conference.findByIdAndDelete(req.params.id);
    console.log(`[API] DELETE /conferences/${req.params.id} | Deleted: ${conference.name}`);
    res.json({ success: true, message: "Conference deleted successfully." });
  } catch (error) {
    console.error(`[ERROR] Conference delete failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
