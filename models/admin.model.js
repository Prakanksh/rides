const mongoose = require('mongoose')
function imageURL(image) {
  if (image != null) {
    return process.env.AWS_MEDIA_URL + image
  } else {
    return process.env.AWS_MEDIA_URL + 'no_image.png'
  }
}

const AdminSchema = new mongoose.Schema(
  {
    adminId: {
      type: Number
    },
    username: {
      type: String,
      trim: true,
      lowercase: true
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String
    },
    mobile: {
      type: String
    },
    countryCode: {
      type: String
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      ENUM: ['admin', 'subAdmin'],
      default: 'subAdmin'
    },
    permission: {
      type: Array
    },
    profilePic: {
      type: String,
      get: imageURL
    },
    status: {
      type: String,
      required: true,
      ENUM: ['active', 'inactive'],
      default: 'active'
    },
    token: {
      type: String
    },
    notification: {
      type: Boolean,
      default: true
    },
    lastUpdate: {
      type: Date
    },
    forceLogout: {
      type: Boolean,
      default: false
    },
    isPasswordSet: {
      type: Boolean,
      default: false
    },
    commission: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toObject: { getters: true, setters: true, virtuals: false },
    toJSON: { getters: true, setters: true, virtuals: false }
  }
)

AdminSchema.pre("save", function (next) {
  // Round commission to 2 decimal places
  if (this.commission !== undefined && this.commission !== null) {
    this.commission = Number(this.commission.toFixed(2));
  }
  
  // Only set adminId for new documents
  if (this.isNew && !this.adminId) {
    mongoose
      .model("admins")
      .findOne({}).sort({ adminId: -1 })
      .then((entry) => {
        this.adminId = (parseInt(entry?.adminId) || 0) + 1
        next();
      })
      .catch((err) => next(err));
  } else {
    next();
  }
});

const Admin = mongoose.model('admins', AdminSchema)

module.exports = Admin
