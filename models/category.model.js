const mongoose = require('mongoose')
function imageURL(image) {
  if (image != null) {
    return process.env.AWS_MEDIA_URL + image
  } else {
    return process.env.AWS_MEDIA_URL + 'no_image.png'
  }
}

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    colorCode: {
      type: String,
    },
    categoryType: {
      type: String,
      required: true,
      enum: ['hire', 'buy']
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

const Category = mongoose.model('categories', CategorySchema)

module.exports = Category
