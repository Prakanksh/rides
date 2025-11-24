const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')
const { generateRandomAlphanumeric } = require('../helpers/helper')

function imageURL (images) {
  if (images != null) {
    return images.map(image=>image.value = process.env.AWS_MEDIA_URL + image)
  } else {
    return process.env.AWS_MEDIA_URL + 'no_image.png'
  }
}

function fileUrl (file) {
  if (file != null) {
    return process.env.AWS_MEDIA_URL + file
  } else {
    return process.env.AWS_MEDIA_URL + 'no_image.png'
  }
}

const ProductSchema = new mongoose.Schema({
  categoryType: {
    type: String,
    required: true,
    trim: true, 
    ENUM:['hire', 'buy']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'categories'
  }, 
  subCategory: {
    type: mongoose.Schema.Types.ObjectId, 
    trim: true,
    ref: 'subcategories'
  },
  fullName: {
    type: String, 
    required: true,
    trim: true
  },
  productId: {
    type: String, 
    required: true,
    trim: true
  },
  description: {
    type: String, 
    required: true,
    trim: true
  },   
  images: {
    type: Array,
    required: false,
    trim: true,
    get: imageURL
  },
  file: {
    type: String,
    required: false,
    trim: true,
    get: fileUrl
  }, 
  rating: {
    type: Number,
    trim: true,
    default: 0
  },
  status: {
    type: String,
    required: true,
    default: 'active',
    ENUM:['active', 'inactive']
  }
},
{
  timestamps: true,
  toObject: { getters: true, setters: true, virtuals: false },
  toJSON: { getters: true, setters: true, virtuals: false }
})
ProductSchema.pre('validate', function (next) {
  if (!this.productId) {
    this.productId = generateRandomAlphanumeric(10);
  }
  next();
});
ProductSchema.plugin(mongoosePaginate)
const Product = mongoose.model('Product', ProductSchema)

module.exports = Product
