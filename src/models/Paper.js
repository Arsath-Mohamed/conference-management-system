const mongoose = require("mongoose");

const paperSchema = new mongoose.Schema({
  title: { type: String, required: true },
  abstract: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  
  // New: Link to conference
  conferenceId: { type: mongoose.Schema.Types.ObjectId, ref: "Conference", required: true },
  
  // New: Topics/Categories
  topics: [{ type: String }],
  
  // Refactor: Array of assigned reviewers
  reviewerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  
  file: { type: String, default: null },
  finalFile: { type: String, default: null },

  status: {
    type: String,
    enum: ["submitted", "under_review", "reviewed", "accepted", "rejected", "revisions"],
    default: "submitted"
  },

  // Author rebuttals to reviews
  rebuttals: [{
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],

  schedule: {
    date: { type: String, default: null },
    time: { type: String, default: null },
    room: { type: String, default: null }
  },

  // Final decision metadata
  conclusion: { type: String, default: null },
  decidedAt: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Paper", paperSchema);