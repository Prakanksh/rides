const { responseData } = require('../helpers/responseData');
const driversService = require('../services/drivers.services');

module.exports = {
  register: async (req, res) => {
    try {
      await driversService.register(req, res);
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG';
      return res.status(422).json(responseData(msg, {}, req, false));
    }
  },

  updateProfile: async (req, res) => {
    try {
      await driversService.updateProfile(req, res);
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG';
      return res.status(422).json(responseData(msg, {}, req, false));
    }
  }
};
