const mongoose = require('mongoose')

const CountrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    countryCode: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      required: true,
      ENUM: ['active', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: true,
    toObject: { getters: true, setters: true, virtuals: false },
    toJSON: { getters: true, setters: true, virtuals: false }
  }
)

const Country = mongoose.model('countries', CountrySchema)

module.exports = Country
