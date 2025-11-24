const mongoose = require('mongoose')

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId
    },
    country: {
      type: mongoose.Types.ObjectId
    },
    addressType: {
      type: String,
      enum: ['home', 'office', 'others']
    },
    zipCode: {
      type: String,
      default: ''
    },
    location: {
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
    },
    area: {
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

const Address = mongoose.model('savedAddress', addressSchema)

module.exports = Address
