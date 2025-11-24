const mongoose = require('mongoose')
const OtpSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      trim: true,
      default: null
    },
    countryCode: {
      type: String,
      trim: true,
      ENUM: ['353', '44'],
      default: null
    },
    email: {
      type: String,
      trim: true,
      default: null
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: false
    },
    otp: {
      type: Number,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true,
    toObject: { getters: true, setters: true, virtuals: false },
    toJSON: { getters: true, setters: true, virtuals: false }
  }
)

const Otp = mongoose.model('otp', OtpSchema)

module.exports = Otp
