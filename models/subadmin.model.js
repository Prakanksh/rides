const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const SubAdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  first_name: {
    type: String,
    required: true,
    trim: true
  },
  last_name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  country_code: {
    type: String,
    max: 10,
    default: +91
  },
  address: {
    type: String
  },
  mobile: {
    type: Number
  },
  password: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    default: 'active'
  },
  token: {
    type: String
  },
  permission: {
    type: Array
  }
},
{
  timestamps: true,
  toObject: { getters: true, setters: true, virtuals: false },
  toJSON: { getters: true, setters: true, virtuals: false }
})
SubAdminSchema.plugin(mongoosePaginate)
const SubAdmin = mongoose.model('SubAdmin', SubAdminSchema)

module.exports = SubAdmin
