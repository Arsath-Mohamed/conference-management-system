const express = require("express");
const Notification = require("../models/Notification");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// GET my notifications
router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, data: notifications || [] });
  } catch (error) {
    console.error(`[ERROR] Notifications fetch failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT mark as read
router.put("/:id/read", async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true }
    );
    res.json({ success: true, message: "Read" });
  } catch (error) {
    console.error(`[ERROR] Notification update failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE my notifications
router.delete("/", async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ success: true, message: "Cleared" });
  } catch (error) {
    console.error(`[ERROR] Notifications clear failed: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
