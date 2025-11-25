// services/ride/driverRide.service.js
const Ride = require("../../models/ride.model");
const Driver = require("../../models/driver.model");
const { responseData } = require("../../helpers/responseData");

module.exports = {

  // -----------------------------
  // DRIVER ACCEPT RIDE
  // -----------------------------
  acceptRide: async (req, res) => {
    const { rideId } = req.body;
    const driverId = req.user?._id;

    if (!rideId) {
      return res.json(responseData("RIDE_ID_REQUIRED", {}, req, false));
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.json(responseData("RIDE_NOT_FOUND", {}, req, false));
    }

    if (ride.status !== "requested") {
      return res.json(responseData("RIDE_ALREADY_ASSIGNED", {}, req, false));
    }

    // Assign driver
    ride.driver = driverId;
    ride.status = "accepted";
    ride.updatedAt = new Date();

    // Generate OTP for ride start (Uber/Ola style)
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    ride.otpForRideStart = otp;

    await ride.save();

    return res.json(
      responseData(
        "RIDE_ACCEPTED",
        {
          ride,
          debugOtp: otp   // RETURN ONLY FOR DEVELOPMENT
        },
        req,
        true
      )
    );
  },

  // -----------------------------
  // DRIVER ARRIVED AT PICKUP
  // -----------------------------
  arrivedAtPickup: async (req, res) => {
    const { rideId } = req.body;
    const driverId = req.user?._id;

    if (!rideId) {
      return res.json(responseData("RIDE_ID_REQUIRED", {}, req, false));
    }

    const ride = await Ride.findOne({ _id: rideId, driver: driverId });
    if (!ride) {
      return res.json(responseData("INVALID_RIDE", {}, req, false));
    }

    if (ride.status !== "accepted") {
      return res.json(responseData("RIDE_NOT_IN_ACCEPTED_STATE", {}, req, false));
    }

    ride.status = "arrived";
    ride.updatedAt = new Date();
    await ride.save();

    return res.json(responseData("DRIVER_ARRIVED", { ride }, req, true));
  },

  // -----------------------------
  // START RIDE (OTP REQUIRED)
  // -----------------------------
  startRide: async (req, res) => {
    const { rideId, otp } = req.body;
    const driverId = req.user?._id;

    if (!rideId || !otp) {
      return res.json(responseData("OTP_REQUIRED", {}, req, false));
    }

    const ride = await Ride.findOne({ _id: rideId, driver: driverId });

    if (!ride) {
      return res.json(responseData("INVALID_RIDE", {}, req, false));
    }

    if (ride.status !== "arrived") {
      return res.json(responseData("RIDE_NOT_READY_TO_START", {}, req, false));
    }

    if (ride.otpForRideStart !== otp) {
      return res.json(responseData("INVALID_OTP", {}, req, false));
    }

    ride.status = "ongoing";
    ride.startedAt = new Date();
    await ride.save();

    return res.json(responseData("RIDE_STARTED", { ride }, req, true));
  },

  // -----------------------------
  // COMPLETE RIDE
  // -----------------------------
  completeRide: async (req, res) => {
    const { rideId } = req.body;
    const driverId = req.user?._id;

    const ride = await Ride.findOne({ _id: rideId, driver: driverId });

    if (!ride) {
      return res.json(responseData("INVALID_RIDE", {}, req, false));
    }

    if (ride.status !== "ongoing") {
      return res.json(responseData("RIDE_NOT_STARTED", {}, req, false));
    }

    ride.status = "completed";
    ride.completedAt = new Date();
    await ride.save();

    return res.json(responseData("RIDE_COMPLETED", { ride }, req, true));
  }

};
