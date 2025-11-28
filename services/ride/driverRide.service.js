// services/ride/driverRide.service.js

const Ride = require("../../models/ride.model");
const { responseData } = require("../../helpers/responseData");

const { ensureWallets, payByWallet, payByCash } = require("../../helpers/walletUtil");

// generate OTP
const genOtp = () => String(Math.floor(1000 + Math.random() * 9000));

module.exports = {

  getAssignedRide: async (req, res) => {
    const ride = await Ride.findOne({
      driver: req.user._id,
      status: { $in: ["requested", "accepted", "arrived", "ongoing"] }
    });
    return res.json(responseData("ASSIGNED_RIDE", { ride }, req, true));
  },

  acceptRide: async (req, res) => {
    const ride = await Ride.findById(req.body.rideId);
    if (!ride) return res.json(responseData("RIDE_NOT_FOUND", {}, req, false));
    if (ride.status !== "requested")
      return res.json(responseData("RIDE_ALREADY_ASSIGNED", {}, req, false));

    ride.driver = req.user._id;
    ride.status = "accepted";
    await ride.save();

    return res.json(responseData("RIDE_ACCEPTED", { ride }, req, true));
  },

  arrivedAtPickup: async (req, res) => {
    const ride = await Ride.findOne({
      _id: req.body.rideId,
      driver: req.user._id
    });

    if (!ride) return res.json(responseData("INVALID_RIDE", {}, req, false));
    if (ride.status !== "accepted")
      return res.json(responseData("RIDE_NOT_IN_ACCEPTED_STATE", {}, req, false));

    ride.status = "arrived";
    ride.otpForRideStart = genOtp();
    ride.updatedAt = new Date();
    await ride.save();

    return res.json(
      responseData("DRIVER_ARRIVED", { ride, otpForTesting: ride.otpForRideStart }, req, true)
    );
  },

  startRide: async (req, res) => {
    const { rideId, otp } = req.body;

    const ride = await Ride.findOne({
      _id: rideId,
      driver: req.user._id
    });

    if (!ride) return res.json(responseData("INVALID_RIDE", {}, req, false));
    if (ride.status !== "arrived")
      return res.json(responseData("RIDE_NOT_READY_TO_START", {}, req, false));
    if (String(ride.otpForRideStart) !== String(otp))
      return res.json(responseData("INVALID_OTP", {}, req, false));

    ride.otpForRideStart = null;
    ride.status = "ongoing";
    ride.startedAt = new Date();
    await ride.save();

    return res.json(responseData("RIDE_STARTED", { ride }, req, true));
  },

  completeRide: async (req, res) => {
    try {
      console.log("=== COMPLETE RIDE START ===");
      console.log("rideId:", req.body.rideId);
      console.log("driverId from token:", req.user._id);

      const ride = await Ride.findOne({
        _id: req.body.rideId,
        driver: req.user._id
      });

      console.log("Ride found:", ride ? "YES" : "NO");

      if (!ride) return res.json(responseData("INVALID_RIDE", {}, req, false));
      if (ride.status !== "ongoing") {
        console.log("Ride status is:", ride.status, "- expected 'ongoing'");
        return res.json(responseData("RIDE_NOT_STARTED", {}, req, false));
      }

      const finalFare = ride.finalFare || ride.estimatedFare;
      console.log("Final fare:", finalFare);
      console.log("Payment method:", ride.paymentMethod);
      console.log("Rider ID:", ride.rider);

      // create wallets if missing
      console.log("Creating wallets...");
      await ensureWallets(ride.rider, req.user._id);
      console.log("Wallets ensured");

      let result;

      if (ride.paymentMethod === "wallet") {
        console.log("Processing wallet payment...");
        result = await payByWallet(ride, ride.rider, req.user._id, finalFare);
      } else {
        console.log("Processing cash payment...");
        result = await payByCash(ride, ride.rider, req.user._id, finalFare);
      }

      console.log("Payment result:", result);

      if (!result.success) {
        return res.json(responseData(result.message, {}, req, false));
      }

      ride.status = "completed";
      ride.completedAt = new Date();
      ride.finalFare = finalFare;
      await ride.save();

      console.log("=== RIDE COMPLETED SUCCESSFULLY ===");
      return res.json(responseData("RIDE_COMPLETED", { ride }, req, true));
    } catch (error) {
      console.error("=== COMPLETE RIDE ERROR ===");
      console.error(error);
      return res.json(responseData(error.message || "SOMETHING_WENT_WRONG", {}, req, false));
    }
  }
};
