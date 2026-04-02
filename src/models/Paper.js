const mongoose = require("mongoose");

const paperSchema = new mongoose.Schema({
  title: { type: String, required: true },
  abstract: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  
  // Refactor: Array of assigned reviewers
  reviewerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  
  file: { type: String, default: null },

  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending"
  },

  schedule: {
    date: { type: String, default: null },
    time: { type: String, default: null },
    room: { type: String, default: null }
  },

  // Final decision metadata (optional, can be inferred from reviews)
  conclusion: { type: String, default: null },
  decidedAt: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Paper", paperSchema);