const categoryService = require('../../services/admins/category.services')
const { responseData } = require('../../helpers/responseData')

module.exports = {
    addCategory: async (req, res) => {
    try {
      await categoryService.addCategory(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  },
  listCategory: async (req, res) => {
    try {
      await categoryService.listCategory(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  },
  updateCategory: async (req, res) => {
    try {
      await categoryService.updateCategory(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  },
  statusChange: async (req, res) => {
    try {
      await categoryService.statusChange(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  },
  reOrderCategory: async (req, res) => {
    try {
      await categoryService.reOrderCategory(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  }
}
