const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')
const aggregatePaginate = require('mongoose-aggregate-paginate-v2')

const UserNotificationSchema = new mongoose.Schema({
  sendTo: {
    type: String,
    enum: ['user', 'specificUser', 'admin'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId
  },
  status: {
    type: Boolean,
    default: true
  }
},
{
  timestamps: true
})
UserNotificationSchema.plugin(mongoosePaginate)
UserNotificationSchema.plugin(aggregatePaginate)
const UserNotificationModel = mongoose.model('userNotifications', UserNotificationSchema)

module.exports = UserNotificationModel


