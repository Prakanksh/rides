const Ride = require("../../models/ride.model");
const { responseData } = require("../../helpers/responseData");

module.exports = {
  
  // -----------------------------
  // FETCH ASSIGNED RIDE
  // -----------------------------
  getAssignedRide: async (req, res) => {
    const driverId = req.user._id;

    const ride = await Ride.findOne({
      driver: driverId,
      status: { $in: ["requested", "accepted", "arrived", "ongoing"] }
    });

    return res.json(responseData("ASSIGNED_RIDE", { ride }, req, true));
  },

  // -----------------------------
  // ACCEPT RIDE
  // -----------------------------
  acceptRide: async (req, res) => {
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
  },

  // -----------------------------
  // DRIVER ARRIVED AT PICKUP
  // -----------------------------
  arrivedAtPickup: async (req, res) => {
    const { rideId } = req.body;
    const driverId = req.user._id;

    const ride = await Ride.findOne({ _id: rideId, driver: driverId });
    if (!ride) return res.json(responseData("INVALID_RIDE", {}, req, false));

    if (ride.status !== "accepted") {
      return res.json(responseData("RIDE_NOT_IN_ACCEPTED_STATE", {}, req, false));
    }

    ride.status = "arrived";
    ride.updatedAt = new Date();
    await ride.save();

    return res.json(responseData("DRIVER_ARRIVED", { ride }, req, true));
  },

  // -----------------------------
  // START RIDE
  // -----------------------------
  startRide: async (req, res) => {
    const { rideId } = req.body;
    const driverId = req.user._id;

    const ride = await Ride.findOne({ _id: rideId, driver: driverId });

    if (!ride) return res.json(responseData("INVALID_RIDE", {}, req, false));
    if (ride.status !== "arrived") {
      return res.json(responseData("RIDE_NOT_READY_TO_START", {}, req, false));
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
    const driverId = req.user._id;

    const ride = await Ride.findOne({ _id: rideId, driver: driverId });

    if (!ride) return res.json(responseData("INVALID_RIDE", {}, req, false));
    if (ride.status !== "ongoing") {
      return res.json(responseData("RIDE_NOT_STARTED", {}, req, false));
    }

    ride.status = "completed";
    ride.completedAt = new Date();
    await ride.save();

    return res.json(responseData("RIDE_COMPLETED", { ride }, req, true));
  },
};
