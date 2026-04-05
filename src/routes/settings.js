const express = require("express");
const Settings = require("../models/Settings");
const { auth, isChair } = require("../middleware/auth");

const router = express.Router();

// GET global settings
router.get("/", async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE global settings (Chair/Admin only)
router.put("/", auth, isChair, async (req, res) => {
  try {
    const { 
      isConferenceAnnounced, 
      name, 
      description, 
      submissionDeadline, 
      eventDate, 
      location 
    } = req.body;
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    
    if (isConferenceAnnounced !== undefined) settings.isConferenceAnnounced = isConferenceAnnounced;
    if (name !== undefined) settings.name = name;
    if (description !== undefined) settings.description = description;
    if (submissionDeadline !== undefined) settings.submissionDeadline = submissionDeadline;
    if (eventDate !== undefined) settings.eventDate = eventDate;
    if (location !== undefined) settings.location = location;

    await settings.save();
    
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
