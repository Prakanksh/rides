const Ride = require("../../models/ride.model");
const Driver = require("../../models/driver.model");
const Vehicle = require("../../models/vehicle.model");
const { responseData } = require("../../helpers/responseData");
const { calculateDistanceInKm } = require("../../helpers/distance");
const { calculateFare } = require("../../helpers/fareConfig");
const { sendRideToDriver, sendToUser } = require("../../socket/emitRide");
const { calculateETA } = require("../../helpers/etaCalculator");

module.exports = {
  createRide: async (req, res) => {
    try {
      const { pickupLocation, dropLocation, vehicleType, paymentMethod } = req.body;

      const riderId = req.user?._id;
      if (!riderId) {
        return res.json(responseData("NOT_AUTHORIZED", {}, req, false));
      }

      if (!pickupLocation?.coordinates || !dropLocation?.coordinates) {
        return res.json(responseData("LOCATIONS_REQUIRED", {}, req, false));
      }

      const [pickupLng, pickupLat] = pickupLocation.coordinates;
      const [dropLng, dropLat] = dropLocation.coordinates;
      const distanceKm = calculateDistanceInKm(pickupLat, pickupLng, dropLat, dropLng);
      const fareData = calculateFare(distanceKm);

      const etaData = await calculateETA({
        origin: [pickupLng, pickupLat],
        destination: [dropLng, dropLat],
        vehicleType,
        distanceKm
      }, {
        useGoogleMaps: false
      });

      const ride = await Ride.create({
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
        estimatedTime: etaData.estimatedTime
      });

      const normalizedVehicleType = vehicleType === "prime sedan" ? "prime-sedan" : vehicleType;
      const vehiclesWithMatchingType = await Vehicle.find({
        type: normalizedVehicleType,
        status: "active"
      }).select("driver").lean();
      
      const driverIdsWithMatchingVehicle = vehiclesWithMatchingType.map(v => v.driver);
      
      if (driverIdsWithMatchingVehicle.length === 0) {
        return res.json(
          responseData(
            "RIDE_CREATED",
            { ride, nearbyDrivers: [], fareBreakdown: fareData.breakdown, message: "No drivers available with requested vehicle type" },
            req,
            true
          )
        );
      }

      const nearbyDrivers = await Driver.find({
        _id: { $in: driverIdsWithMatchingVehicle },
        isAvailable: true,
        registrationStatus: "approved",
        status: "active",
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [pickupLng, pickupLat]
            },
            $maxDistance: 5000
          }
        }
      }).select("_id firstName lastName");
      
      if (nearbyDrivers.length > 0) {
        nearbyDrivers.forEach(driver => {
          sendRideToDriver(driver._id.toString(), ride);
        });
      }

      return res.json(
        responseData(
          "RIDE_CREATED",
          { ride, nearbyDrivers, fareBreakdown: fareData.breakdown },
          req,
          true
        )
      );
    } catch (err) {
      return res.json(responseData(err.message || "SERVER_ERROR", {}, req, false));
    }
  },

  nearbyDrivers: async (req, res) => {
    try {
      let { pickupLat, pickupLng } = req.query;

      if (!pickupLat || !pickupLng) {
        return res.json(responseData("COORDINATES_REQUIRED", {}, req, false));
      }
         pickupLat = parseFloat(pickupLat);
    pickupLng = parseFloat(pickupLng);

      const drivers = await Driver.find({
        isAvailable: true,
        registrationStatus: "approved",
        status: "active",
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [pickupLng, pickupLat] },
            $maxDistance: 5000
          }
        }
      }).select("firstName lastName mobile location");

      
      return res.json(responseData("NEARBY_DRIVERS", { drivers }, req, true));
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false));
    }
  },

  getOneRide: async (req, res) => {
    const { rideId } = req.query;

    if (!rideId) {
      return res.json(responseData("RIDE_ID_REQUIRED", {}, req, false));
    }

    const ride = await Ride.findById(rideId);
    if (!ride) return res.json(responseData("RIDE_NOT_FOUND", {}, req, false));

    return res.json(responseData("RIDE_DETAIL", { ride }, req, true));
  },

  getActiveRide: async (req, res) => {
    const userId = req.user._id;

    const ride = await Ride.findOne({
      rider: userId,
      status: { $in: ["requested", "accepted", "arrived", "ongoing", "reachedDestination"] }
    });

    if (!ride) return res.json(responseData("NO_ACTIVE_RIDE", {}, req, true));

    return res.json(responseData("ACTIVE_RIDE", { ride }, req, true));
  },

  cancelRide: async (req, res) => {
    const { rideId, reason } = req.body;
    const riderId = req.user?._id;

    const ride = await Ride.findOne({ _id: rideId, rider: riderId });
    if (!ride) return res.json(responseData("INVALID_RIDE", {}, req, false));

    if (ride.status === "completed" || ride.status === "cancelled") {
      return res.json(responseData("RIDE_CANNOT_BE_CANCELLED", {}, req, false));
    }

    if (ride.status === "ongoing" || ride.status === "reachedDestination") {
      return res.json(responseData("CANNOT_CANCEL_RIDE_IN_PROGRESS", {}, req, false));
    }

    ride.status = "cancelled";
    ride.cancellationReason = reason || "Cancelled by user";
    ride.cancelledBy = "user";
    ride.cancelledAt = new Date();
    await ride.save();

    if (ride.driver) {
      await Driver.findByIdAndUpdate(ride.driver, { isAvailable: true });
      sendRideToDriver(ride.driver.toString(), { 
        event: "rideCancelled", 
        ride, 
        cancelledBy: "user" 
      });
    }

    return res.json(responseData("RIDE_CANCELLED", { ride }, req, true));
  }
};
