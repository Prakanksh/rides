const mongoose = require('mongoose')
const EmailOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      default: null
    },
    otpEmail: {
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

const EmailOtp = mongoose.model('email_otp', EmailOtpSchema)

module.exports = EmailOtp
