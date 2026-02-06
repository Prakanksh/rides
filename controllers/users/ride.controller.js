const { responseData } = require("../../helpers/responseData");
const rideService = require("../../services/ride/ride.service");

module.exports = {
  createRide: async (req, res) => {
    try { await rideService.createRide(req, res); } catch (err) { return res.json(responseData(err.message || "SOMETHING_WENT_WRONG", {}, req, false)); }
  },
  estimateRide: async (req, res) => {
    try { await rideService.estimateRide(req, res); } catch (err) { return res.json(responseData(err.message || "SOMETHING_WENT_WRONG", {}, req, false)); }
  },
   applyPromo: async (req, res) => {
    try { await rideService.applyPromo(req, res); } catch (err) { return res.json(responseData(err.message || "SOMETHING_WENT_WRONG", {}, req, false)); }
  },


  nearbyDrivers: async (req, res) => {
    try {
      await rideService.nearbyDrivers(req, res);
    } catch (err) {
      const msg = err.message || "SOMETHING_WENT_WRONG";
      return res.json(responseData(msg, {}, req, false));
    }
  },

  getOneRide: async (req, res) => {
    try {
      await rideService.getOneRide(req, res);
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false));
    }
  },

  getActiveRide: async (req, res) => {
    try {
      await rideService.getActiveRide(req, res);
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false));
    }
  },

  paymentDue: async (req, res) => {
    try {
      await rideService.paymentDue(req, res);
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false));
    }
  },

  cancelRide: async (req, res) => {
    try {
      await rideService.cancelRide(req, res);
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false));
    }
  },

  scheduleRide: async (req, res) => {
    try {
      await rideService.scheduleRide(req, res);
    } catch (err) {
      return res.json(responseData(err.message || "SOMETHING_WENT_WRONG", {}, req, false));
    }
  },

  rescheduleRide: async (req, res) => {
    try {
      await rideService.rescheduleRide(req, res);
    } catch (err) {
      return res.json(responseData(err.message || "SOMETHING_WENT_WRONG", {}, req, false));
    }
  },

  getScheduledRides: async (req, res) => {
    try {
      await rideService.getScheduledRides(req, res);
    } catch (err) {
      return res.json(responseData(err.message || "SOMETHING_WENT_WRONG", {}, req, false));
    }
  }
};
