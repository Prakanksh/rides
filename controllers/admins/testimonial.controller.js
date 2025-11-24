const { responseData } = require('../../helpers/responseData')
const Service = require('../../services/admins/testimonial.service')

module.exports = {
    listTestimonials: async (req, res) => {
        try {
            await Service.listTestimonials(req, res)
        } catch (err) {
            const msg = err.message || 'SOMETHING_WENT_WRONG'
            return res.status(422).json(responseData(msg, {}, req))
        }
    },
    addTestimonials: async (req, res) => {
        try {
            await Service.addTestimonials(req, res)
        } catch (err) {
            const msg = err.message || 'SOMETHING_WENT_WRONG'
            return res.status(422).json(responseData(msg, {}, req))
        }
    },
    updateTestimonials: async (req, res) => {
        try {
            await Service.updateTestimonials(req, res)
        } catch (err) {
            const msg = err.message || 'SOMETHING_WENT_WRONG'
            return res.status(422).json(responseData(msg, {}, req))
        }
    },

    deleteTestimonials: async (req, res) => {
        try {
            await Service.deleteTestimonials(req, res)
        } catch (err) {
            const msg = err.message || 'SOMETHING_WENT_WRONG'
            return res.status(422).json(responseData(msg, {}, req))
        }
    },
    updateStatus: async (req, res) => {
        try {
            await Service.updateStatus(req, res)
        } catch (err) {
            const msg = err.message || 'SOMETHING_WENT_WRONG'
            return res.status(422).json(responseData(msg, {}, req))
        }
    },
    reOrder: async (req, res) => {
        try {
            await Service.reOrder(req, res)
        } catch (err) {
            const msg = err.message || 'SOMETHING_WENT_WRONG'
            return res.status(422).json(responseData(msg, {}, req))
        }
    }
}
