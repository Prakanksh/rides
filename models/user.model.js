const mongoose = require('mongoose')
function imageURL(image) {
  if (image) {
    return process.env.AWS_MEDIA_URL + image
  } else {
    return ''
  }
}

const addressSchema = new mongoose.Schema(
  {
    country: {
      type: mongoose.Types.ObjectId,
      required: true
    },
    zipCode: {
      type: String,
      default: ''
    },
    locationObject: {
      type: {
        type: String,
        default: 'Point'
      },
      coordinates: [Number]
    },
    completeAddress: {
      type: String
    },
    defaultAddress: {
      type: Boolean,
      default: false
    },
    floor: {
      type: String,
      trim: true
    },
    howToReach: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    toObject: { getters: true, setters: true, virtuals: false },
    toJSON: { getters: true, setters: true, virtuals: false }
  }
)

const userSchema = new mongoose.Schema(
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
      required: false,
      trim: true
    },
    countryCode: {
      type: String,
      trim: true,
      ENUM: ['353', '44'],
      default: null
    },
    mobile: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    address: {
      type: [addressSchema]
    },
    role: {
      type: String,
      default: false
    },
    isMobileVerified: {
      type: Number,
      default: 0
    },
    isEmailVerified: {
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
    isDeleted : {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      required: false
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
    visitingStartDate: {
      type: Date
    },
    visitingEndDate: {
      type: Date
    },
    token: {
      type: String
    },
    registrationType: {
      type: String,
      default: 'manual'
    },
    rating: {
      type: Number,
      default: null
    },
    socialId: {
      type: String,
      default: null
    },
    notifications: {
      type: Boolean,
      default: true
    },
    forceLogout: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toObject: { getters: true, setters: true, virtuals: false },
    toJSON: { getters: true, setters: true, virtuals: false }
  }
)

userSchema.pre('save', function (next) {
  mongoose
    .model('users')
    .findOne({})
    .sort({ userId: -1 })
    .then((entry) => {
      this.userId = (parseInt(entry?.userId) || 0) + 1
      next()
    })
})

const User = mongoose.model('users', userSchema)

module.exports = User
