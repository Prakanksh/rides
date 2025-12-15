const mongoose = require("mongoose");

const SupportSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },

    message: { type: String, required: true },

    status: {
      type: String,
      enum: ["open", "in-progress", "closed","reopened"],
      default: "open"
    },

    role: {
      type: String,
      enum: ["user", "driver"],
      required: true
    },

    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "role", 
      required: true
    }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Support", SupportSchema);
