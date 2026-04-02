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
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT mark as read
router.put("/:id/read", async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true }
    );
    res.json({ message: "Read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE my notifications
router.delete("/", async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ message: "Cleared" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
