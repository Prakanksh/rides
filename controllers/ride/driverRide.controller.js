const { responseData } = require("../../helpers/responseData");
const rideService = require("../../services/ride/driverRide.service");

module.exports = {
  getAssignedRide: async (req, res) => {
    try {
      await rideService.getAssignedRide(req, res);
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false));
    }
  },

  acceptRide: async (req, res) => {
    try {
      await rideService.acceptRide(req, res);
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false));
    }
  },

  arrivedAtPickup: async (req, res) => {
    try {
      await rideService.arrivedAtPickup(req, res);
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false));
    }
  },

  startRide: async (req, res) => {
    try {
      await rideService.startRide(req, res);
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false));
    }
  },

  completeRide: async (req, res) => {
    try {
      await rideService.completeRide(req, res);
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false));
    }
  },
};
