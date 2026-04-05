const express = require("express");
const Paper = require("../models/Paper");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// GET /api/dashboard
router.get("/", async (req, res) => {
  try {
    const totalPapers = await Paper.countDocuments();
    const accepted = await Paper.countDocuments({ status: "accepted" });
    const pending = await Paper.countDocuments({ status: "pending" });
    const usersCount = await User.countDocuments();

    console.log(`[API] GET /dashboard | User: ${req.user.name} | Total: ${totalPapers}`);
    
    res.json({
      totalPapers,
      accepted,
      pending,
      users: usersCount
    });
  } catch (error) {
    console.error(`[ERROR] Dashboard fetch failed: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
