const { responseData } = require("../../helpers/responseData");
const rideService = require("../../services/ride/ride.service");

module.exports = {
  createRide: async (req, res) => {
    try {
      await rideService.createRide(req, res);
    } catch (err) {
      console.log("CreateRide Controller Error:", err);
      return res.json(
        responseData(err.message || "SERVER_ERROR", {}, req, false)
      );
    }
  },

  getNearbyDrivers: async (req, res) => {
    try {
      await rideService.getNearbyDrivers(req, res);
    } catch (err) {
      console.log("Nearby Controller Error:", err);
      return res.json(
        responseData(err.message || "SERVER_ERROR", {}, req, false)
      );
    }
  }
};
