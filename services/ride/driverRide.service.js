// services/ride/driverRide.service.js
const Ride = require("../../models/ride.model");
const { responseData } = require("../../helpers/responseData");

// small helper to generate 4-digit OTP as string
const generate4DigitOtp = () => String(Math.floor(1000 + Math.random() * 9000));

module.exports = {
  // -----------------------------
  // FETCH ASSIGNED RIDE
  // -----------------------------
  getAssignedRide: async (req, res) => {
    try {
      const driverId = req.user._id;

      const ride = await Ride.findOne({
        driver: driverId,
        status: { $in: ["requested", "accepted", "arrived", "ongoing"] }
      });

      return res.json(responseData("ASSIGNED_RIDE", { ride }, req, true));
    } catch (err) {
      console.log("getAssignedRide err:", err);
      return res.json(responseData("ERROR_OCCUR", err.message, req, false));
    }
  },

  // -----------------------------
  // ACCEPT RIDE
  // -----------------------------
  acceptRide: async (req, res) => {
    try {
      const { rideId } = req.body;
      const driverId = req.user._id;

      if (!rideId) return res.json(responseData("RIDE_ID_REQUIRED", {}, req, false));

      const ride = await Ride.findById(rideId);
      if (!ride) return res.json(responseData("RIDE_NOT_FOUND", {}, req, false));

      if (ride.status !== "requested") {
        return res.json(responseData("RIDE_ALREADY_ASSIGNED", {}, req, false));
      }

      ride.driver = driverId;
      ride.status = "accepted";
      await ride.save();

      return res.json(responseData("RIDE_ACCEPTED", { ride }, req, true));
    } catch (err) {
      console.log("acceptRide err:", err);
      return res.json(responseData("ERROR_OCCUR", err.message, req, false));
    }
  },

  // -----------------------------
  // DRIVER ARRIVED AT PICKUP
  // - generate OTP and save to ride.otpForRideStart
  // -----------------------------
  arrivedAtPickup: async (req, res) => {
    try {
      const { rideId } = req.body;
      const driverId = req.user._id;

      if (!rideId) return res.json(responseData("RIDE_ID_REQUIRED", {}, req, false));

      const ride = await Ride.findOne({ _id: rideId, driver: driverId });
      if (!ride) return res.json(responseData("INVALID_RIDE", {}, req, false));

      if (ride.status !== "accepted") {
        return res.json(responseData("RIDE_NOT_IN_ACCEPTED_STATE", {}, req, false));
      }

      // set arrived state
      ride.status = "arrived";
      ride.updatedAt = new Date();

      // generate OTP for ride start and save it (string)
      const otp = generate4DigitOtp();
      ride.otpForRideStart = otp;

      await ride.save();

      // NOTE: returning OTP in response only for testing/dev.
      // In production you'd send it to the rider via SMS/notification instead.
      return res.json(
        responseData(
          "DRIVER_ARRIVED",
          { ride, otpForTesting: otp },
          req,
          true
        )
      );
    } catch (err) {
      console.log("arrivedAtPickup err:", err);
      return res.json(responseData("ERROR_OCCUR", err.message, req, false));
    }
  },

  // -----------------------------
  // START RIDE
  // - requires otp in body and validates it
  // -----------------------------
  startRide: async (req, res) => {
    try {
      const { rideId, otp } = req.body;
      const driverId = req.user._id;

      if (!rideId) return res.json(responseData("RIDE_ID_REQUIRED", {}, req, false));
      if (!otp) return res.json(responseData("OTP_REQUIRED", {}, req, false));

      const ride = await Ride.findOne({ _id: rideId, driver: driverId });
      if (!ride) return res.json(responseData("INVALID_RIDE", {}, req, false));

      if (ride.status !== "arrived") {
        return res.json(responseData("RIDE_NOT_READY_TO_START", {}, req, false));
      }

      // check OTP
      if (!ride.otpForRideStart) {
        return res.json(responseData("OTP_NOT_GENERATED", {}, req, false));
      }

      if (String(ride.otpForRideStart) !== String(otp)) {
        return res.json(responseData("INVALID_OTP", {}, req, false));
      }

      // OTP valid — clear it and start ride
      ride.otpForRideStart = null;
      ride.status = "ongoing";
      ride.startedAt = new Date();
      await ride.save();

      return res.json(responseData("RIDE_STARTED", { ride }, req, true));
    } catch (err) {
      console.log("startRide err:", err);
      return res.json(responseData("ERROR_OCCUR", err.message, req, false));
    }
  },

  // -----------------------------
  // COMPLETE RIDE
  // -----------------------------
  completeRide: async (req, res) => {
    try {
      const { rideId } = req.body;
      const driverId = req.user._id;

      if (!rideId) return res.json(responseData("RIDE_ID_REQUIRED", {}, req, false));

      const ride = await Ride.findOne({ _id: rideId, driver: driverId });

      if (!ride) return res.json(responseData("INVALID_RIDE", {}, req, false));
      if (ride.status !== "ongoing") {
        return res.json(responseData("RIDE_NOT_STARTED", {}, req, false));
      }

      ride.status = "completed";
      ride.completedAt = new Date();
      await ride.save();

      return res.json(responseData("RIDE_COMPLETED", { ride }, req, true));
    } catch (err) {
      console.log("completeRide err:", err);
      return res.json(responseData("ERROR_OCCUR", err.message, req, false));
    }
  },
};
