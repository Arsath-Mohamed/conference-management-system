const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  isConferenceAnnounced: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    default: "Annual Conference"
  },
  description: {
    type: String,
    default: "Welcome to our annual conference."
  },
  submissionDeadline: {
    type: Date,
    default: null
  },
  eventDate: {
    type: Date,
    default: null
  },
  location: {
    type: String,
    default: "TBD"
  }
});

module.exports = mongoose.model("Settings", settingsSchema);
