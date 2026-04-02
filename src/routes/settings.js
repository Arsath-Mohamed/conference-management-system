const express = require("express");
const Settings = require("../models/Settings");
const { auth, isChair } = require("../middleware/auth");

const router = express.Router();

// GET global settings
router.get("/", async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings();
    await settings.save();
  }
  res.json(settings);
});

// UPDATE global settings (Chair/Admin only)
router.put("/", auth, isChair, async (req, res) => {
  const { isConferenceAnnounced } = req.body;
  
  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings();
  }
  
  settings.isConferenceAnnounced = isConferenceAnnounced;
  await settings.save();
  
  res.json(settings);
});

module.exports = router;
