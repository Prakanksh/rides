const Ride = require("../../models/ride.model");
const Driver = require("../../models/driver.model");
const { responseData } = require("../../helpers/responseData");

module.exports = {
  acceptRide: async (req, res) => {
    try {
      const driverId = req.user?._id;
      const { rideId } = req.body;

      if (!driverId) {
        return res.json(responseData("NOT_AUTHORIZED", {}, req, false));
      }

      if (!rideId) {
        return res.json(responseData("RIDE_ID_REQUIRED", {}, req, false));
      }

      // Check ride exists
      const ride = await Ride.findById(rideId);
      if (!ride) {
        return res.json(responseData("RIDE_NOT_FOUND", {}, req, false));
      }

      // If already accepted by driver
      if (ride.driver && ride.driver.toString() !== driverId) {
        return res.json(responseData("RIDE_ALREADY_ACCEPTED", {}, req, false));
      }

      // If ride already started
      if (ride.status !== "requested") {
        return res.json(responseData("RIDE_NOT_AVAILABLE", {}, req, false));
      }

      // Ensure driver is active & available
      const driver = await Driver.findById(driverId);
      if (!driver || !driver.isAvailable || driver.status !== "active") {
        return res.json(responseData("DRIVER_NOT_AVAILABLE", {}, req, false));
      }

      // Assign ride to driver
      ride.driver = driverId;
      ride.status = "accepted";
      await ride.save();

      return res.json(
        responseData("RIDE_ACCEPTED", { ride }, req, true)
      );
    } catch (error) {
      console.log("acceptRide Error:", error);
      return res.json(responseData("SERVER_ERROR", {}, req, false));
    }
  }
};
