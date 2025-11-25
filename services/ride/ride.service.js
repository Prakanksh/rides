const Ride = require("../../models/ride.model");
const Driver = require("../../models/driver.model");
const { responseData } = require("../../helpers/responseData");

const { calculateDistanceInKm } = require("../../helpers/distance");
const { calculateFare } = require("../../helpers/fareConfig");

module.exports = {
  // ----------------------------------------
  // CREATE RIDE
  // ----------------------------------------
  createRide: async (req, res) => {
    try {
      const {
        pickupLocation,
        dropLocation,
        vehicleType,
        paymentMethod
      } = req.body;

      const riderId = req.user?._id;

      if (!riderId) {
        return res.json(responseData("NOT_AUTHORIZED", {}, req, false));
      }

      if (!pickupLocation?.coordinates || !dropLocation?.coordinates) {
        return res.json(responseData("LOCATIONS_REQUIRED", {}, req, false));
      }

      if (!vehicleType) {
        return res.json(responseData("VEHICLE_TYPE_REQUIRED", {}, req, false));
      }

      // Extract Lats & Lngs
      const [pickupLat, pickupLng] = pickupLocation.coordinates;
      const [dropLat, dropLng] = dropLocation.coordinates;

      const distanceKm = calculateDistanceInKm(
        pickupLat,
        pickupLng,
        dropLat,
        dropLng
      );

      const fareData = calculateFare(distanceKm);

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
      });

      return res.json(
        responseData(
          "RIDE_CREATED",
          { ride, fareBreakdown: fareData.breakdown },
          req,
          true
        )
      );

    } catch (err) {
      console.log("CreateRide Error:", err);
      return res.json(responseData("SERVER_ERROR", {}, req, false));
    }
  },

  // ----------------------------------------
  // GET NEARBY DRIVERS
  // ----------------------------------------
  getNearbyDrivers: async (req, res) => {
    try {
      const { pickupLat, pickupLng } = req.query;

      if (!pickupLat || !pickupLng) {
        return res.json(responseData("COORDINATES_REQUIRED", {}, req, false));
      }

      const radiusKm = 5; // 5km radius
      const radiusInMeters = radiusKm * 1000;

      const drivers = await Driver.find({
        isAvailable: true,
        status: "active",
        registrationStatus: "approved",
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [parseFloat(pickupLng), parseFloat(pickupLat)]
            },
            $maxDistance: radiusInMeters
          }
        }
      }).select("firstName lastName mobile location vehicleType");

      return res.json(
        responseData("NEARBY_DRIVERS", { drivers }, req, true)
      );

    } catch (err) {
      console.log("NearbyDrivers Error:", err);
      return res.json(responseData("SERVER_ERROR", {}, req, false));
    }
  }
};
