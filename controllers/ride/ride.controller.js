const { responseData } = require('../../helpers/responseData');
const rideService = require('../../services/ride/ride.service');

module.exports = {
  createRide: async (req, res) => {
    try {
      await rideService.createRide(req, res);
    } catch (err) {
      return res.json(
        responseData(err.message || 'SOMETHING_WENT_WRONG', {}, req, false)
      );
    }
  }
};
