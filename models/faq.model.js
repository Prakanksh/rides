const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const FaqSchema = new mongoose.Schema({
  title: {
    type: String
  },
  content: {
    type: String
  },
  sequence: {
    type: Number
  },
  status: {
    type: String,
    ENUM: ['active', 'inactive'],
    required: true,
    default: 'active'
  }
},
{
  timestamps: true,
  toObject: { getters: true, setters: true, virtuals: false },
  toJSON: { getters: true, setters: true, virtuals: false }
})
FaqSchema.plugin(mongoosePaginate)
const Faq = mongoose.model('Faq', FaqSchema)

module.exports = Faq
