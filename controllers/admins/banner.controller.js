const bannerService = require('../../services/admins/banner.services');
const { responseData } = require('../../helpers/responseData');

module.exports = {
  addBanner: async (req, res) => {
    try {
      await bannerService.addBanner(req, res);
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG';
      return res.status(422).json(responseData(msg, {}, req, true));
    }
  },
  listBanner: async (req, res) => {
    try {
      await bannerService.listBanner(req, res);
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG';
      return res.status(422).json(responseData(msg, {}, req, true));
    }
  },
  updateBanner: async (req, res) => {
    try {
      await bannerService.updateBanner(req, res);
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG';
      return res.status(422).json(responseData(msg, {}, req, true));
    }
  },
  deleteBanner: async (req, res) => {
    try {
      await bannerService.deleteBanner(req, res);
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG';
      return res.status(422).json(responseData(msg, {}, req, true));
    }
  },
  statusChange: async (req, res) => {
    try {
      await bannerService.statusChange(req, res);
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG';
      return res.status(422).json(responseData(msg, {}, req, true));
    }
  },
  reOrderBanner: async (req, res) => {
    try {
      await bannerService.reOrderBanner(req, res);
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG';
      return res.status(422).json(responseData(msg, {}, req, true));
    }
  },
};
