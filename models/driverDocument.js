const mongoose = require("mongoose");

const DriverDocumentSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User"
    },

    documents: {
      aadhar: {
        front: { type: String, default: null },
        back: { type: String, default: null },
        status: { type: String, default: "pending" }
      },

      pan: {
        front: { type: String, default: null },
        status: { type: String, default: "pending" }
      },

      drivingLicence: {
        front: { type: String, default: null },
        back: { type: String, default: null },
        status: { type: String, default: "pending" }
      },

      rc: {
        front: { type: String, default: null },
        back: { type: String, default: null },
        status: { type: String, default: "pending" }
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("DriverDocument", DriverDocumentSchema);
