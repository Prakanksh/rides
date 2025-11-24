const mongoose = require('mongoose')

const awsUrlSchema = new mongoose.Schema({
    path: {
        type: String
    },
    key: {
        type: String
    },
    status: {
        type: String,
        ENUM: ['user', 'unused']
    }
},
    {
        timestamps: true,
        toObject: { getters: true, setters: true, virtuals: false },
        toJSON: { getters: true, setters: true, virtuals: false }
    })
const AwsUrl = mongoose.model('AwsUrls', awsUrlSchema)

module.exports = AwsUrl
