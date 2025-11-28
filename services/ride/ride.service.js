const Ride = require("../../models/ride.model");
const Driver = require("../../models/driver.model");
const { responseData } = require("../../helpers/responseData");

const { calculateDistanceInKm } = require("../../helpers/distance");
const { calculateFare } = require("../../helpers/fareConfig");

// IMPORT SOCKET EMITTER
const { sendRideToDriver } = require("../../socket/emitRide");

module.exports = {

  // -----------------------------
  // CREATE RIDE
  // -----------------------------
  createRide: async (req, res) => {
    try {
      const {
        pickupLocation,
        dropLocation,
        vehicleType,
        paymentMethod
      } = req.body;

      const riderId = req.user?._id;
      if (!riderId) return res.json(responseData("NOT_AUTHORIZED", {}, req, false));

      if (!pickupLocation?.coordinates || !dropLocation?.coordinates) {
        return res.json(responseData("LOCATIONS_REQUIRED", {}, req, false));
      }

      if (!vehicleType) {
        return res.json(responseData("VEHICLE_TYPE_REQUIRED", {}, req, false));
      }

      const [pickupLat, pickupLng] = pickupLocation.coordinates;
      const [dropLat, dropLng] = dropLocation.coordinates;

      const distanceKm = calculateDistanceInKm(pickupLat, pickupLng, dropLat, dropLng);
      const fareData = calculateFare(distanceKm);

      let ride = await Ride.create({
        rider: riderId,
        driver: null,
        pickupLocation,
        dropLocation,
        distance: Number(distanceKm.toFixed(2)),
        estimatedFare: fareData.estimatedFare,
        finalFare: 0,
        vehicleType,
        paymentMethod: paymentMethod || "cash",
        status: "requested",
      });

      // AUTO-ASSIGN (very basic: pick first available)
      const nearestDriver = await Driver.findOne({
        isAvailable: true,
        registrationStatus: "approved",
        status: "active"
      }).select("_id");

      if (nearestDriver) {
        // assign (ride still in requested state until driver accepts)
        ride.driver = nearestDriver._id;
        await ride.save();

        // send via socket
        const ok = sendRideToDriver(nearestDriver._id.toString(), ride);
        console.log("sendRideToDriver result:", ok);
      } else {
        console.log("No available drivers to auto-assign");
      }

      return res.json(responseData("RIDE_CREATED", { ride, fareBreakdown: fareData.breakdown }, req, true));
    } catch (err) {
      console.error("createRide err:", err);
      return res.json(responseData(err.message || "SERVER_ERROR", {}, req, false));
    }
  },

  // -----------------------------
  // NEARBY DRIVERS
  // -----------------------------
  nearbyDrivers: async (req, res) => {
    try {
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        return res.json(responseData("COORDINATES_REQUIRED", {}, req, false));
      }

      const drivers = await Driver.find({
        isAvailable: true,
        registrationStatus: "approved",
        status: "active",
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [lng, lat] },
            $maxDistance: 5000
          }
        }
      }).select("firstName lastName mobile location");

      return res.json(responseData("NEARBY_DRIVERS", { drivers }, req, true));
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false));
    }
  },

  // -----------------------------
  // GET ONE RIDE
  // -----------------------------
  getOneRide: async (req, res) => {
    const { rideId } = req.query;

    if (!rideId) {
      return res.json(responseData("RIDE_ID_REQUIRED", {}, req, false));
    }

    const ride = await Ride.findById(rideId);
    if (!ride) return res.json(responseData("RIDE_NOT_FOUND", {}, req, false));

    return res.json(responseData("RIDE_DETAIL", { ride }, req, true));
  },

  // -----------------------------
  // GET ACTIVE RIDE
  // -----------------------------
  getActiveRide: async (req, res) => {
    const userId = req.user._id;

    const ride = await Ride.findOne({
      rider: userId,
      status: { $in: ["requested", "accepted", "arrived", "ongoing"] }
    });

    if (!ride) return res.json(responseData("NO_ACTIVE_RIDE", {}, req, true));

    return res.json(responseData("ACTIVE_RIDE", { ride }, req, true));
  },

  // -----------------------------
  // CANCEL RIDE
  // -----------------------------
  cancelRide: async (req, res) => {
    const { rideId, reason } = req.body;
    const riderId = req.user?._id;

    const ride = await Ride.findOne({ _id: rideId, rider: riderId });
    if (!ride) return res.json(responseData("INVALID_RIDE", {}, req, false));

    if (ride.status === "completed") {
      return res.json(responseData("RIDE_ALREADY_COMPLETED", {}, req, false));
    }

    ride.status = "cancelled";
    ride.cancellationReason = reason || "user cancelled";
    await ride.save();

    return res.json(responseData("RIDE_CANCELLED", { ride }, req, true));
  }
};
