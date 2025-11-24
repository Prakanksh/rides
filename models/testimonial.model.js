const { trim } = require('lodash')
const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const TestimonialSchema = new mongoose.Schema({
    file: {
        type: String,
        required:true
    },
    name: {
        type: String,
        trim:true,
        required:true
    },
    rating: {
        type: Number,
        enum: [0, 1, 2, 3, 4, 5],
        default:0,
        required: true
    },
    description: {
        type: String,
        trim:true,
        required:true
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
TestimonialSchema.plugin(mongoosePaginate)
const Testimonials = mongoose.model('Testimonials', TestimonialSchema)

module.exports = Testimonials
