const mongoose = require("mongoose");

const paperSchema = new mongoose.Schema({
  title: { type: String, required: true },
  abstract: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  reviewerId: { type: String, default: null },
  reviewerName: { type: String, default: null },
  file: { type: String, default: null },

  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending"
  },

  // ✅ ADD THIS
  schedule: {
    date: { type: String, default: null },
    time: { type: String, default: null },
    room: { type: String, default: null }
  },

  reviewComment: { type: String, default: null },
  reviewRating: { type: Number, default: null },
  reviewDecision: { type: String, default: null },
  reviewedAt: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Paper", paperSchema);