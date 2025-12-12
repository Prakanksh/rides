const Ride = require("../../models/ride.model");
const Driver = require("../../models/driver.model");
const Vehicle = require("../../models/vehicle.model");
const { responseData } = require("../../helpers/responseData");
const { calculateDistanceInKm } = require("../../helpers/distance");
const { calculateFare } = require("../../helpers/fareConfig");
const { sendRideToDriver, sendToUser } = require("../../socket/emitRide");

module.exports = {

  // createRide: async (req, res) => {
  //   try {
  //     const {
  //       pickupLocation,
  //       dropLocation,
  //       vehicleType,
  //       paymentMethod
  //     } = req.body;

  //     const riderId = req.user?._id;
  //     if (!riderId) return res.json(responseData("NOT_AUTHORIZED", {}, req, false));

  //     if (!pickupLocation?.coordinates || !dropLocation?.coordinates) {
  //       return res.json(responseData("LOCATIONS_REQUIRED", {}, req, false));
  //     }

  //     if (!vehicleType) {
  //       return res.json(responseData("VEHICLE_TYPE_REQUIRED", {}, req, false));
  //     }

  //     const [pickupLat, pickupLng] = pickupLocation.coordinates;
  //     const [dropLat, dropLng] = dropLocation.coordinates;

  //     const distanceKm = calculateDistanceInKm(pickupLat, pickupLng, dropLat, dropLng);
  //     const fareData = calculateFare(distanceKm);

  //     let ride = await Ride.create({
  //       rider: riderId,
  //       driver: null,
  //       pickupLocation,
  //       dropLocation,
  //       distance: Number(distanceKm.toFixed(2)),
  //       estimatedFare: fareData.estimatedFare,
  //       finalFare: 0,
  //       vehicleType,
  //       paymentMethod: paymentMethod || "cash",
  //       status: "requested",
  //     });

  //     const nearestDriver = await Driver.findOne({
  //       isAvailable: true,
  //       registrationStatus: "approved",
  //       status: "active"
  //     }).select("_id");

  //     if (nearestDriver) {
  //       ride.driver = nearestDriver._id;
  //       await ride.save();
  //       const ok = sendRideToDriver(nearestDriver._id.toString(), ride);
  //       console.log("sendRideToDriver result:", ok);
  //     } else {
  //       console.log("No available drivers to auto-assign");
  //     }

  //     return res.json(responseData("RIDE_CREATED", { ride, fareBreakdown: fareData.breakdown }, req, true));
  //   } catch (err) {
  //     console.error("createRide err:", err);
  //     return res.json(responseData(err.message || "SERVER_ERROR", {}, req, false));
  //   }
  // },
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
      status: "requested"
    });

    // Normalize vehicle type for matching (ride uses "prime sedan", vehicle uses "prime-sedan")
    const normalizedVehicleType = vehicleType === "prime sedan" ? "prime-sedan" : vehicleType;
    
    // Find drivers with matching vehicle type
    const vehiclesWithMatchingType = await Vehicle.find({
      type: normalizedVehicleType,
      status: "active"
    }).select("driver").lean();
    
    const driverIdsWithMatchingVehicle = vehiclesWithMatchingType.map(v => v.driver);
    
    console.log(`🔍 Found ${driverIdsWithMatchingVehicle.length} drivers with vehicle type ${normalizedVehicleType}`);
    
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
    
    console.log(`📍 Found ${nearbyDrivers.length} nearby drivers within 5km`);
    
    if (nearbyDrivers.length > 0) {
      nearbyDrivers.forEach(driver => {
        console.log(`📤 Attempting to send ride to driver ${driver._id}`);
        const sent = sendRideToDriver(driver._id.toString(), ride);
        console.log(`📤 Send result for driver ${driver._id}: ${sent}`);
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

    if (ride.status === "completed") {
      return res.json(responseData("RIDE_ALREADY_COMPLETED", {}, req, false));
    }

    if (ride.status === "cancelled") {
      return res.json(responseData("RIDE_ALREADY_CANCELLED", {}, req, false));
    }

    if (ride.status === "reachedDestination") {
      return res.json(responseData("CANNOT_CANCEL_RIDE_AT_DESTINATION", {}, req, false));
    }

    ride.status = "cancelled";
    ride.cancellationReason = reason || "Cancelled by user";
    ride.cancelledBy = "user";
    ride.cancelledAt = new Date();
    await ride.save();

    // Set driver as available when ride is cancelled by user
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
