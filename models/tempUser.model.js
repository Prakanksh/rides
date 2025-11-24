const mongoose = require('mongoose')
function imageURL(image) {
  if (image) {
    return process.env.AWS_MEDIA_URL + image
  } else {
    return ''
  }
}
const TempUserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: false,
      trim: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    countryCode: {
      type: String,
      trim: true,
      default: '+91'
    },
    mobile: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: false
    },
    socialId: {
      type: String,
      trim: true
    },
    isMobileVerified: {
      type: Number,
      default: 0
    },
    profilePic: {
      type: String,
      get: imageURL
    },
    status: {
      type: String,
      required: false,
      ENUM: ['active', 'inactive', 'deleted'],
      default: 'active'
    },
    deviceId: {
      type: String,
      default: null
    },
    deviceType: {
      type: String,
      ENUM: ['android', 'ios'],
      default: null
    },
    deviceToken: {
      type: String,
      default: null
    },
    registrationType: {
      type: String,
      default: 'manual'
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toObject: { getters: true, setters: true, virtuals: false },
    toJSON: { getters: true, setters: true, virtuals: false }
  }
)

const TempUser = mongoose.model('tempusers', TempUserSchema)

module.exports = TempUser
