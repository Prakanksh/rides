const { responseData } = require("../../helpers/responseData");
const driverRideService = require("../../services/ride/driverRide.service");

module.exports = {
  acceptRide: async (req, res) => {
    try {
      await driverRideService.acceptRide(req, res);
    } catch (err) {
      return res.json(
        responseData(err.message || "SOMETHING_WENT_WRONG", {}, req, false)
      );
    }
  }
};
