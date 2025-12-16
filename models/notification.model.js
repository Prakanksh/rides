const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')
const aggregatePaginate = require('mongoose-aggregate-paginate-v2')

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId
  },
  userType: {
    type: String,
    enum: [ 'user', 'admin', 'driver'],
    default: 'user'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
},
{
  timestamps: true
})
NotificationSchema.plugin(mongoosePaginate)
NotificationSchema.plugin(aggregatePaginate)
const NotificationModel = mongoose.model('notifications', NotificationSchema)

module.exports = NotificationModel


