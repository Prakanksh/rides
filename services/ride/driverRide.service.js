const Ride = require("../../models/ride.model");
const Driver = require("../../models/driver.model");
const { responseData } = require("../../helpers/responseData");
const { ensureWallets, payByWallet, payByCash } = require("../../helpers/walletUtil");
const { sendToUser, sendRideToDriver } = require("../../socket/emitRide");

const genOtp = () => String(Math.floor(1000 + Math.random() * 9000));

module.exports = {

  getAssignedRide: async (req, res) => {
    const ride = await Ride.findOne({
      driver: req.user._id,
      status: { $in: ["requested", "accepted", "arrived", "ongoing", "reachedDestination"] }
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

  reachedDestination: async (req, res) => {
    try {
      const ride = await Ride.findOne({
        _id: req.body.rideId,
        driver: req.user._id
      });

      if (!ride) return res.json(responseData("INVALID_RIDE", {}, req, false));
      if (ride.status !== "ongoing") {
        return res.json(responseData("RIDE_NOT_STARTED", {}, req, false));
      }

      const finalFare = ride.finalFare || ride.estimatedFare;
      ride.status = "reachedDestination";
      await ride.save();

      await ensureWallets(ride.rider, req.user._id);
      const result = ride.paymentMethod === "wallet" 
        ? await payByWallet(ride, ride.rider, req.user._id, finalFare)
        : await payByCash(ride, ride.rider, req.user._id, finalFare);
        
      if (!result.success) {
        return res.json(responseData(result.message, {}, req, false));
      }

      const updatedRide = await Ride.findById(ride._id);
      const eventName = ride.paymentMethod === "wallet" ? "user:rideCompleted" : "user:reachedDestination";
      const message = ride.paymentMethod === "wallet" ? "RIDE_COMPLETED" : "REACHED_DESTINATION";
      
      sendToUser(ride.rider.toString(), eventName, { ride: updatedRide });
      return res.json(responseData(message, { ride: updatedRide }, req, true));
    } catch (error) {
      console.error("reachedDestination err", error);
      return res.json(responseData(error.message || "SOMETHING_WENT_WRONG", {}, req, false));
    }
  },

  cancelRide: async (req, res) => {
    const { rideId, reason } = req.body;
    const driverId = req.user?._id;

    const ride = await Ride.findOne({ _id: rideId, driver: driverId });
    if (!ride) return res.json(responseData("INVALID_RIDE", {}, req, false));

    if (ride.status === "completed") {
      return res.json(responseData("RIDE_ALREADY_COMPLETED", {}, req, false));
    }

    if (ride.status === "cancelled") {
      return res.json(responseData("RIDE_ALREADY_CANCELLED", {}, req, false));
    }

    if (ride.status === "ongoing" || ride.status === "reachedDestination") {
      return res.json(responseData("CANNOT_CANCEL_RIDE_IN_PROGRESS", {}, req, false));
    }

    ride.cancelledDrivers.push(driverId);
    ride.driver = null;
    ride.status = "requested";
    ride.otpForRideStart = null;
    await ride.save();

    const newDriver = await Driver.findOne({
      _id: { $nin: ride.cancelledDrivers },
      isAvailable: true,
      registrationStatus: "approved",
      status: "active"
    }).select("_id");

    if (newDriver) {
      ride.driver = newDriver._id;
      await ride.save();

      sendRideToDriver(newDriver._id.toString(), ride);
      sendToUser(ride.rider.toString(), "user:driverChanged", { 
        ride, 
        message: "Your driver cancelled. New driver assigned!" 
      });

      return res.json(responseData("RIDE_REASSIGNED", { ride, newDriverAssigned: true }, req, true));
    } else {
      sendToUser(ride.rider.toString(), "user:searchingDriver", { 
        ride, 
        message: "Your driver cancelled. Finding new driver..." 
      });

      return res.json(responseData("RIDE_SEARCHING_DRIVER", { ride, newDriverAssigned: false }, req, true));
    }
  }
};
