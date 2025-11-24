const mongoose = require('mongoose')
function imageURL(image) {
  if (image != null) {
    return process.env.AWS_MEDIA_URL + image
  } else {
    return process.env.AWS_MEDIA_URL + 'no_image.png'
  }
}

const BannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    file: {
      type: String,
      get: imageURL
    },
    sequence: {
      type: Number
    },

  },
  {
    timestamps: true,
    toObject: { getters: true, setters: true, virtuals: false },
    toJSON: { getters: true, setters: true, virtuals: false }
  }
)

const Banner = mongoose.model('banners', BannerSchema)

module.exports = Banner
