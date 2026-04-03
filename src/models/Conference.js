const mongoose = require("mongoose");

const conferenceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  topics: [{ type: String }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ["open", "closed", "finished"],
    default: "open"
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Conference", conferenceSchema);
