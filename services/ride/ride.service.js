// services/ride/ride.service.js

const Ride = require("../../models/ride.model");
const { responseData } = require("../../helpers/responseData");
const { calculateDistanceInKm } = require("../../helpers/distance");
const { calculateFare } = require("../../helpers/fareConfig");
const { findBestDriver } = require("../driver/assignDriver.service");

module.exports = {
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

      const [pickupLat, pickupLng] = pickupLocation.coordinates;
      const [dropLat, dropLng] = dropLocation.coordinates;

      const distanceKm = calculateDistanceInKm(
        pickupLat,
        pickupLng,
        dropLat,
        dropLng
      );
      const fareData = calculateFare(distanceKm);
      const assignedDriver = await findBestDriver(
        pickupLocation,
        vehicleType
      );
      const ride = await Ride.create({
        rider: riderId,
        driver: assignedDriver?._id || null,
        pickupLocation,
        dropLocation,
        distance: Number(distanceKm.toFixed(2)),
        estimatedFare: fareData.estimatedFare,
        finalFare: 0,
        vehicleType,
        paymentMethod: paymentMethod || "cash",
        status: "requested"
      });

      return res.json(
        responseData(
          "RIDE_CREATED",
          {
            ride,
            assignedDriver,
            fareBreakdown: fareData.breakdown
          },
          req,
          true
        )
      );

    } catch (err) {
      console.error("Create Ride Error:", err);
      return res.json(responseData(err.message || "SERVER_ERROR", {}, req, false));
    }
  }
};
