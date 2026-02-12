const mongoose = require("mongoose");

const RideCallSchema = new mongoose.Schema(
  {
    ride: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", required: true },
    callerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    callerType: { type: String, enum: ["rider", "driver"], required: true },
    channel: { type: String, required: true },
    status: {
      type: String,
      enum: ["ringing", "accepted", "rejected", "ended"],
      default: "ringing"
    },
    startTime: { type: Date },
    endTime: { type: Date },
    duration: { type: Number, default: 0 }
  },
  { timestamps: true, versionKey: false }
);

RideCallSchema.index({ ride: 1, status: 1 });

module.exports = mongoose.model("RideCall", RideCallSchema);
