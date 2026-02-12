const mongoose = require("mongoose");

const RideChatMessageSchema = new mongoose.Schema(
  {
    ride: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderType: { type: String, enum: ["user", "driver"], required: true },
    text: { type: String, required: true, trim: true }
  },
  { timestamps: true, versionKey: false }
);

RideChatMessageSchema.index({ ride: 1, createdAt: 1 });

module.exports = mongoose.model("RideChatMessage", RideChatMessageSchema);
