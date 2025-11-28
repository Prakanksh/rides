const { responseData } = require("../../helpers/responseData");
const driverRideService = require("../../services/ride/driverRide.service");

module.exports = {
  getAssignedRide: async (req, res) => {
    try { await driverRideService.getAssignedRide(req, res); } catch (err) { return res.json(responseData(err.message || "SOMETHING_WENT_WRONG", {}, req, false)); }
  },
  acceptRide: async (req, res) => {
    try { await driverRideService.acceptRide(req, res); } catch (err) { return res.json(responseData(err.message || "SOMETHING_WENT_WRONG", {}, req, false)); }
  },
  arrivedAtPickup: async (req, res) => {
    try { await driverRideService.arrivedAtPickup(req, res); } catch (err) { return res.json(responseData(err.message || "SOMETHING_WENT_WRONG", {}, req, false)); }
  },
  startRide: async (req, res) => {
    try { await driverRideService.startRide(req, res); } catch (err) { return res.json(responseData(err.message || "SOMETHING_WENT_WRONG", {}, req, false)); }
  },
  completeRide: async (req, res) => {
    try { await driverRideService.completeRide(req, res); } catch (err) { return res.json(responseData(err.message || "SOMETHING_WENT_WRONG", {}, req, false)); }
  },
  cancelRide: async (req, res) => {
    try { await driverRideService.cancelRide(req, res); } catch (err) { return res.json(responseData(err.message || "SOMETHING_WENT_WRONG", {}, req, false)); }
  },
};
