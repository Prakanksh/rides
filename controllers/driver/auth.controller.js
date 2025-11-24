const { responseData } = require('../../helpers/responseData.js');
const driverAuthService = require('../../services/driver/driver.auth.services');

module.exports = {

  sendOtpLogin: async (req, res) => {
    try {
      await driverAuthService.sendOtpLogin(req, res);
    } catch (err) {
      return res
        .status(422)
        .json(responseData(err.message || 'SOMETHING_WENT_WRONG', {}, req, false));
    }
  },

  verifyOtpLogin: async (req, res) => {
    try {
      await driverAuthService.verifyOtpLogin(req, res);
    } catch (err) {
      return res
        .status(422)
        .json(responseData(err.message || 'SOMETHING_WENT_WRONG', {}, req, false));
    }
  }

};
