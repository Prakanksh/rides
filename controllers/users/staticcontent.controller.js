const { responseData } = require('../../helpers/responseData')
const userService = require('../../services/users/staticcontent.services')
module.exports = {
  getStaticSlug: async (req, res) => {
    try {
      await userService.getStaticSlug(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  getStaticContentBySlug: async (req, res) => {
    try {
      await userService.getStaticContentBySlug(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  getFaq: async (req, res) => {
    try {
      await userService.getFaq(req, res);
    } catch (err) {
      const msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, req));
    }
  },
  getBanners: async (req, res) => {
    try {
      await userService.getBanners(req, res);
    } catch (err) {
      const msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, req));
    }
  },

}
