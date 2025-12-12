const Ride = require("../../models/ride.model");
const Driver = require("../../models/driver.model");
const Vehicle = require("../../models/vehicle.model");
const User = require("../../models/user.model");
const { responseData } = require("../../helpers/responseData");
const { ensureWallets, payByWallet, payByCash, confirmCashPayment } = require("../../helpers/walletUtil");
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

  getAvailableRides: async (req, res) => {
    try {
      const driverId = req.user._id;
      const driver = await Driver.findById(driverId);
      if (!driver) {
        return res.json(responseData("DRIVER_NOT_FOUND", {}, req, false));
      }

      if (!driver.isAvailable || driver.registrationStatus !== "approved" || driver.status !== "active") {
        return res.json(responseData("DRIVER_NOT_AVAILABLE", {}, req, false));
      }

      const vehicle = await Vehicle.findOne({ 
        driver: driverId, 
        status: "active" 
      });

      if (!vehicle) {
        return res.json(responseData("NO_ACTIVE_VEHICLE", {}, req, false));
      }
      const normalizedVehicleType = vehicle.type === "prime-sedan" ? "prime sedan" : vehicle.type;

      const baseQuery = {
        status: "requested",
        vehicleType: normalizedVehicleType,
        cancelledDrivers: { $ne: driverId }
      };

      let availableRides;
      if (driver.location && driver.location.coordinates && driver.location.coordinates.length === 2) {
        const [driverLng, driverLat] = driver.location.coordinates;
        availableRides = await Ride.find({
          ...baseQuery,
          pickupLocation: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [driverLng, driverLat]
              },
              $maxDistance: 5000 // 5km
            }
          }
        })
          .populate({ path: "rider", model: "users", select: "firstName lastName mobile email" })
          .sort({ createdAt: -1 })
          .limit(20);
      } else {
        return res.json(responseData("DRIVER_LOCATION_REQUIRED", { message: "Please add your location to fetch available rides" }, req, false));
      }

      return res.json(responseData("AVAILABLE_RIDES", { rides: availableRides, count: availableRides.length }, req, true));
    } catch (error) {
      console.error("getAvailableRides error:", error);
      return res.json(responseData(error.message || "SOMETHING_WENT_WRONG", {}, req, false));
    }
  },

  acceptRide: async (req, res) => {
    const ride = await Ride.findById(req.body.rideId);
    if (!ride) return res.json(responseData("RIDE_NOT_FOUND", {}, req, false));
    if (ride.status !== "requested")
      return res.json(responseData("RIDE_ALREADY_ASSIGNED", {}, req, false));

    ride.driver = req.user._id;
    ride.status = "accepted";
    
    const otp = genOtp();
    ride.otpForRideStart = otp;
    await ride.save();

    // Set driver as unavailable when ride is accepted
    await Driver.findByIdAndUpdate(req.user._id, { isAvailable: false });

    sendToUser(ride.rider.toString(), "user:rideAccepted", { ride, event: "rideAccepted", otp });

    return res.json(responseData("RIDE_ACCEPTED", { ride, otp }, req, true));
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
    ride.updatedAt = new Date();
    await ride.save();

    sendToUser(ride.rider.toString(), "user:driverArrived", { rideId: ride._id, event: "driverArrived" });

    return res.json(
      responseData("DRIVER_ARRIVED", { ride }, req, true)
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
      
      if (ride.paymentMethod === "wallet") {
        const result = await payByWallet(ride, ride.rider, req.user._id, finalFare);
        if (!result.success) {
          return res.json(responseData(result.message, {}, req, false));
        }
        const updatedRide = await Ride.findById(ride._id);
        sendToUser(ride.rider.toString(), "user:rideCompleted", { ride: updatedRide });
        return res.json(responseData("RIDE_COMPLETED", { ride: updatedRide }, req, true));
      } else {
        const result = await payByCash(ride, ride.rider, req.user._id, finalFare);
        if (!result.success) {
          return res.json(responseData(result.message, {}, req, false));
        }
        const updatedRide = await Ride.findById(ride._id);
        sendToUser(ride.rider.toString(), "user:rideCompleted", { ride: updatedRide });
        return res.json(responseData("RIDE_COMPLETED", { ride: updatedRide }, req, true));
      }
    } catch (error) {
      console.error("reachedDestination err", error);
      return res.json(responseData(error.message || "SOMETHING_WENT_WRONG", {}, req, false));
    }
  },

  receivedPayment: async (req, res) => {
    try {
      const ride = await Ride.findOne({
        _id: req.body.rideId,
        driver: req.user._id
      });

      if (!ride) return res.json(responseData("INVALID_RIDE", {}, req, false));
      if (ride.status !== "reachedDestination" || ride.paymentMethod !== "cash") {
        return res.json(responseData("INVALID_RIDE_STATE", {}, req, false));
      }
      if (ride.paidToDriver) {
        return res.json(responseData("PAYMENT_ALREADY_CONFIRMED", {}, req, false));
      }

      const finalFare = ride.finalFare || ride.estimatedFare || 0;
      if (finalFare <= 0) {
        return res.json(responseData("INVALID_FARE_AMOUNT", {}, req, false));
      }
      const result = await confirmCashPayment(ride, ride.rider, req.user._id, finalFare);

      if (!result.success) {
        return res.json(responseData(result.message, {}, req, false));
      }

      const updatedRide = await Ride.findById(ride._id);
      sendToUser(ride.rider.toString(), "user:rideCompleted", { ride: updatedRide });
      return res.json(responseData("PAYMENT_CONFIRMED", { ride: updatedRide }, req, true));
    } catch (error) {
      console.error("receivedPayment err", error);
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

    // Set driver as available when ride is cancelled by driver
    await Driver.findByIdAndUpdate(driverId, { isAvailable: true });

    // Normalize vehicle type for matching (ride uses "prime sedan", vehicle uses "prime-sedan")
    const normalizedVehicleType = ride.vehicleType === "prime sedan" ? "prime-sedan" : ride.vehicleType;
    
    // Find drivers with matching vehicle type
    const vehiclesWithMatchingType = await Vehicle.find({
      type: normalizedVehicleType,
      status: "active"
    }).select("driver").lean();
    
    const driverIdsWithMatchingVehicle = vehiclesWithMatchingType.map(v => v.driver);
    
    if (driverIdsWithMatchingVehicle.length === 0) {
      sendToUser(ride.rider.toString(), "user:searchingDriver", { 
        ride, 
        message: "Your driver cancelled. Finding new driver..." 
      });
      return res.json(responseData("RIDE_SEARCHING_DRIVER", { ride, newDriverAssigned: false }, req, true));
    }

    const [pickupLng, pickupLat] = ride.pickupLocation.coordinates;
    // Filter out cancelled drivers from matching vehicle drivers
    const availableDriverIds = driverIdsWithMatchingVehicle.filter(
      id => !ride.cancelledDrivers.some(cancelledId => String(cancelledId) === String(id))
    );
    
    if (availableDriverIds.length === 0) {
      sendToUser(ride.rider.toString(), "user:searchingDriver", { 
        ride, 
        message: "Your driver cancelled. Finding new driver..." 
      });
      return res.json(responseData("RIDE_SEARCHING_DRIVER", { ride, newDriverAssigned: false }, req, true));
    }
    
    const newDriver = await Driver.findOne({
      _id: { $in: availableDriverIds },
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
