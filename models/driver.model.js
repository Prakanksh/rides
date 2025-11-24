const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      unique: true
    },
    otp: { type: String },
    email: {
      type: String,
      unique: true,
      sparse: true
    },
    otpExpires: { type: Date },
    firstName: { type: String },
    lastName: { type: String },
    fatherName: { type: String },
    dob: { type: String },
    countryCode: { type: String },
    primaryMobile: { type: String },
    secondaryMobile: { type: String },
    bloodGroup: { type: String },
    city: { type: String },
    address: { type: String },
    state: { type: String },
    languages: [String],
    profile: { type: String },
    token: { type: String },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }
    },
    wallet: { type: Number, default: 0 },
    commissionWallet: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    // Registration flow
    registrationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },

    rejectionReason: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'inactive'
    },
    isEmailVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false }
  },
  { timestamps: true, versionKey: false }
);

DriverSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Driver', DriverSchema);
