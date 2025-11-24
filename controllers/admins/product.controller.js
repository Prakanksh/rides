const { responseData } = require('../../helpers/responseData')
const productServices = require('../../services/admins/product.services')

module.exports = {
    addProduct: async (req, res) => {
    try {
      await productServices.addProduct(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  },
  listProduct: async (req, res) => {
    try {
      await productServices.listProduct(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  },
  listSubCategory: async (req, res) => {
    try {
      await productServices.listSubCategory(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  },
  updateProduct: async (req, res) => {
    try {
      await productServices.updateProduct(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  },
  statusChange: async (req, res) => {
    try {
      await productServices.statusChange(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  },
  productRatingList: async (req, res) => {
    try {
      await productServices.productRatingList(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req, true))
    }
  }
}
