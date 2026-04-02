const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Paper",
    required: true
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  reviewerName: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comment: {
    type: String,
    required: true
  },
  decision: {
    type: String,
    enum: ["accept", "reject", "revisions"],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Review", reviewSchema);
