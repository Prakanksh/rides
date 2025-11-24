const Testimonials = require('../../models/testimonial.model')
const { isEmpty } = require('lodash')
const { responseData } = require('../../helpers/responseData')
const {
    handleListRequest
} = require('../../helpers/helper')
const constant = require('../../helpers/constant')
const { default: mongoose } = require('mongoose')
const { query } = require('express')

module.exports = {
    listTestimonials: async (req, res) => {
        try {
            // req.query.sortKey = 'sequence'
            // req.query.sortType = 'asc'

            // let {sortKey, sortType} = req.query
            const aggregationPipeline = await handleListRequest(req.query)
            const queryResult = await Testimonials.aggregate(aggregationPipeline)

            return res.json(
                responseData(
                    'GET_LIST',
                    queryResult.length > 0
                        ? queryResult[0]
                        : constant.staticResponseForEmptyResult,
                    req,
                    true
                )
            )
        } catch (error) {
            console.log('error', error)
            return res.json(responseData('ERROR_OCCUR', error.message, req, false))
        }
    },
    addTestimonials: async (req, res) => {
        try {
            const { file, name, rating, description } = req.body

            await Testimonials.create({ file, name, rating, description })
            res.json(responseData('TESTIMONIAL_CREATED', null, req, true))
        } catch (err) {
            res.json(responseData(err.message, {}, req, false))
        }
    },
    updateTestimonials: async (req, res) => {
        try {
            let { id } = req.params
            const { file, name, rating, description } = req.body

            await Testimonials.updateOne({ _id: mongoose.Types.ObjectId(id) }, { $set: { file, name, rating, description } })
            res.json(responseData('TESTIMONIAL_UPDATE', null, req, true))
        } catch (err) {
            res.json(responseData(err.message, {}, req, false))
        }
    },
    deleteTestimonials: async (req, res) => {
        try {
            let { id } = req.params
            await Testimonials.deleteOne({ _id: mongoose.Types.ObjectId(id) })
            res.json(responseData('TESTIMONIAL_DELETE', {}, req, true))
        } catch (err) {
            res.json(responseData(err.message, {}, req, false))
        }
    },
    updateStatus: async (req, res) => {
        try {
            let { id, status } = req.params
            const testimonial = await Testimonials.updateOne({ _id: id }, { $set: { status } })
            if (!isEmpty(testimonial)) {
                res.json(responseData('TESTIMONIAL_STATUS_UPDATE', {}, req, true))
            } else {
                res.json(responseData('ID_UNAVAILABLE', {}, req, true))
            }
        } catch (err) {
            return res.json(responseData(err.message, {}, req, false))
        }
    },
    reOrder: async (req, res) => {
        try {
            const { sequence } = req.body
            console.log(' sequence ', sequence)
            sequence.forEach(async item => {
                await Testimonials.updateOne(
                    { _id: item._id },
                    { $set: { sequence: item.sequence } }
                );
            })
            return res.json(responseData('TESTIMONIAL_SEQUENCE_UPDATED', {}, req, true))
        } catch (err) {
            return res.json(responseData(err.message, {}, req, false))
        }
    }
}
