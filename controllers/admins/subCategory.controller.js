const subCategoryService = require('../../services/admins/subCategory.services')
const { responseData } = require('../../helpers/responseData')

module.exports = {
    addSubCategory: async (req, res) => {
    try {
      await subCategoryService.addSubCategory(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  },
  listSubCategory: async (req, res) => {
    try {
      await subCategoryService.listSubCategory(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  },
  updateSubCategory: async (req, res) => {
    try {
      await subCategoryService.updateSubCategory(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  },
  statusChange: async (req, res) => {
    try {
      await subCategoryService.statusChange(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  },
  listCategory: async (req, res) => {
    try {
      await subCategoryService.listCategory(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  }
}
