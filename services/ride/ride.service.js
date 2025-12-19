const Ride = require("../../models/ride.model");
const Driver = require("../../models/driver.model");
const Vehicle = require("../../models/vehicle.model");
const { responseData } = require("../../helpers/responseData");
const { calculateDistanceInKm } = require("../../helpers/distance");
const { calculateFare, calculateAllVehicleFares } = require("../../helpers/fareConfig");
const { sendRideToDriver, sendToUser, _getIo } = require("../../socket/emitRide");
const { getDriverSocketId } = require("../../socket/driverSocketMap");
const { calculateETA } = require("../../helpers/etaCalculator");
const promoCodeModel = require("../../models/promoCode.model");
const { calculateDiscount } = require("../../helpers/promoUtil");
const { resolveRideFare } = require("../../helpers/walletUtil");

module.exports = {
  // New flow: User selects vehicle and creates ride (updates existing ride from estimate)
  createRide: async (req, res) => {
    try {
      const { pickupLocation, dropLocation, vehicleType, paymentMethod, promoCode } = req.body;
      const { rideId } = req.params;
      console.log(req.body)

      const riderId = req.user?._id;
      if (!riderId) {
        return res.json(responseData("NOT_AUTHORIZED", {}, req, false));
      }

      const existingRide = await Ride.findOne({ _id: rideId, rider: riderId });

      if (!existingRide) {
        return res.json(responseData("RIDE_NOT_FOUND", {}, req, false));
      }

      // Only allow "create" on fresh estimate rides.
      // Prevents updating already active/completed/cancelled rides by mistake.
      if (existingRide.status !== "estimating") {
        return res.json(
          responseData(
            "INVALID_RIDE_STATE",
            { currentStatus: existingRide.status },
            req,
            false
          )
        );
      }


      if (!pickupLocation?.coordinates || !dropLocation?.coordinates) {
        return res.json(responseData("LOCATIONS_REQUIRED", {}, req, false));
      }

      if (!vehicleType) {
        return res.json(responseData("VEHICLE_TYPE_REQUIRED", {}, req, false));
      }

      if(promoCode){
       
           const promo = await promoCodeModel.findOne({ code:promoCode, isActive: true });

      if (!promo) {
        return res.json(responseData("INVALID_PROMO_CODE", {}, req, false));
      }

      if (promo.expiryDate < new Date()) {
        return res.json(responseData("PROMO_CODE_EXPIRED", {}, req, false));
      }

  if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
     return res.json(responseData("PROMO_CODE_USAGE_LIMIT_EXCEEDED", {}, req, false));
 
    
  }
  // Per-user usage limit
  const userUsageCount = await Ride.countDocuments({
    rider: existingRide.rider,
    promoCode: promo.code,
     status: {
    $in: [
      "accepted",
      "arrived",
      "ongoing",
      "reachedDestination",
      "completed"
    ]
  }
  });
// console.log(promo.perUserLimit,userUsageCount,"usage2")
  if (promo.perUserLimit > 0 && userUsageCount >= promo.perUserLimit) {
    
      return res.json(responseData("PROMO_CODE_PER_USER_LIMIT_EXCEEDED", {}, req, false));
    // return { isValid: false, message: "PROMO_CODE_PER_USER_LIMIT_EXCEEDED" };
  }

// await promoCodeModel.updateOne(
//     { _id: promo._id },
//     { $inc: { usedCount: 1 },
//     } );
      }

      const [pickupLng, pickupLat] = pickupLocation.coordinates;
      const [dropLng, dropLat] = dropLocation.coordinates;
      const distance = calculateDistanceInKm(pickupLat, pickupLng, dropLat, dropLng);
      const normalizedVehicleType = vehicleType === "prime sedan" ? "prime-sedan" : vehicleType;

      const etaData = await calculateETA({
        origin: [pickupLng, pickupLat],
        destination: [dropLng, dropLat],
        vehicleType: normalizedVehicleType,
        distanceKm: distance
      }, { useGoogleMaps: false });

      const now = new Date();
      const estimatedEndTime = new Date(now.getTime() + etaData.estimatedTime * 60 * 1000);

      const scheduledRides = await Ride.find({
        rider: riderId,
        isScheduled: true,
        status: { $in: ["scheduled", "scheduled_ready", "requested", "accepted", "arrived", "ongoing", "reachedDestination"] }
      });

      const bufferMinutes = 15;
      for (const scheduledRide of scheduledRides) {
        const scheduledStartTime = scheduledRide.scheduledFor;
        const scheduledEndTime = new Date(scheduledStartTime.getTime() + (scheduledRide.estimatedTime || 0) * 60 * 1000);

        const timeDiff1 = Math.abs(estimatedEndTime - scheduledStartTime) / (1000 * 60);
        const timeDiff2 = Math.abs(scheduledEndTime - now) / (1000 * 60);

        if (timeDiff1 < bufferMinutes || timeDiff2 < bufferMinutes) {
          return res.json(responseData("RIDE_TIME_CONFLICT", {}, req, false));
        }
      }

      // Calculate promo discount if promo code is provided
      const fareResult = calculateFare(distance, { vehicleType: normalizedVehicleType });
      const originalFare = Number((fareResult?.estimatedFare || 0).toFixed(2));
      let discountAmount = 0;
      let finalFare = originalFare;
      
      if (promoCode && originalFare > 0) {
        const discountResult = await calculateDiscount(promoCode, originalFare);
        if (discountResult.isValid) {
          discountAmount = discountResult.discountAmount;
          finalFare = Math.max(0, Number((originalFare - discountAmount).toFixed(2)));
        }
      }

      // Update ride with vehicle selection and other details
      const ride = await Ride.findByIdAndUpdate(
        rideId,
        {
          pickupLocation,
          dropLocation,
          distance: Number(distance.toFixed(2)),
          estimatedFare: [],
          finalFare: finalFare,
          originalFare: originalFare,
          discountAmount: discountAmount,
          vehicleType: normalizedVehicleType,
          paymentMethod: paymentMethod || "cash",
          status: "requested",
          promoCode: promoCode || null,
          estimatedTime: etaData.estimatedTime
        },
        { new: true }
      );

      if (!ride) {
        return res.json(responseData("RIDE_UPDATE_FAILED", {}, req, false));
      }

      // Find drivers with matching vehicle type
      const vehiclesWithMatchingType = await Vehicle.find({
        type: normalizedVehicleType,
        status: "active"
      }).select("driver").lean();
      
      const driverIdsWithMatchingVehicle = vehiclesWithMatchingType.map(v => v.driver);
      
      if (driverIdsWithMatchingVehicle.length === 0) {
        return res.json(
          responseData(
            "RIDE_CREATED",
            { ride, nearbyDrivers: [], message: "No drivers available with requested vehicle type" },
            req,
            true
          )
        );
      }

      // Find nearby available drivers
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
      
      // Send ride to all nearby drivers
      if (nearbyDrivers.length > 0) {
        nearbyDrivers.forEach(driver => {
          sendRideToDriver(driver._id.toString(), ride);
        });
      }

      return res.json(
        responseData(
          "RIDE_CREATED",
          { ride, nearbyDrivers, estimatedTime: etaData.estimatedTime },
          req,
          true
        )
      );
    } catch (err) {
      console.error("createRide error:", err);
      return res.json(responseData(err.message || "SERVER_ERROR", {}, req, false));
    }
  },

  // Step 1: User estimates ride with just pickup and drop location (no vehicle type)
  estimateRide: async (req, res) => {
    try {
      const { pickupLocation, dropLocation } = req.body;

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

      // Calculate fare for all vehicle types
      const fareData = await calculateAllVehicleFares(distanceKm);

      // Create ride with status "estimating" (no vehicle type selected yet)
      const ride = await Ride.create({
        rider: riderId,
        driver: null,
        pickupLocation,
        dropLocation,
        distance: Number(distanceKm.toFixed(2)),
        estimatedFare: fareData, // Array of fares for all vehicle types
        status: "estimating"
      });

      return res.json(
        responseData(
          "RIDE_ESTIMATED",
          { ride, allVehicleFares: fareData },
          req,
          true
        )
      );
    } catch (err) {
      console.error("estimateRide error:", err);
      return res.json(responseData(err.message || "SERVER_ERROR", {}, req, false));
    }
  },

  // Step 2: User applies promo code to get discount
  applyPromo: async (req, res) => {
    try {
      const { code, userId, rideId } = req.body;
      if (!code) {
        return res.json(responseData("PROMO_CODE_REQUIRED", {}, req, false));
      }

      const promo = await promoCodeModel.findOne({ code, isActive: true });
      if (!promo) {
        return res.json(responseData("INVALID_PROMO_CODE", {}, req, false));
      }

      if (promo.expiryDate < new Date()) {
        return res.json(responseData("PROMO_CODE_EXPIRED", {}, req, false));
      }

  if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
     return res.json(responseData("PROMO_CODE_USAGE_LIMIT_EXCEEDED", {}, req, false));
    // return { isValid: false, message: "PROMO_CODE_USAGE_LIMIT_EXCEEDED" };
    
  }

  // Per-user usage limit
  const userUsageCount = await Ride.countDocuments({
    rider: userId,
    promoCode: promo.code,
      status: {
    $in: [
      "accepted",
      "arrived",
      "ongoing",
      "reachedDestination",
      "completed"
    ]
  }
  });
  if (promo.perUserLimit > 0 && userUsageCount >= promo.perUserLimit) {
    
      return res.json(responseData("PROMO_CODE_PER_USER_LIMIT_EXCEEDED", {}, req, false));
    // return { isValid: false, message: "PROMO_CODE_PER_USER_LIMIT_EXCEEDED" };
  }



      const discountInfo = {
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        maxDiscountValue: promo.maxDiscountValue || 0,
        code: promo.code
      };

      return res.json(
        responseData(
          "PROMO_CODE_APPLIED",
          { discount: discountInfo, userId, rideId },
          req,
          true
        )
      );
    } catch (err) {
      console.error("applyPromo error:", err);
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
      status: { $in: ["estimating", "scheduled", "scheduled_ready", "requested", "accepted", "arrived", "ongoing", "reachedDestination"] }
    });

    if (!ride) return res.json(responseData("NO_ACTIVE_RIDE", {}, req, true));

    return res.json(responseData("ACTIVE_RIDE", { ride }, req, true));
  },

  paymentDue: async (req, res) => {
    const riderId = req.user?._id;
    const { rideId } = req.query || {};
    if (!riderId) return res.json(responseData("NOT_AUTHORIZED", {}, req, false));
    if (!rideId) return res.json(responseData("RIDE_ID_REQUIRED", {}, req, false));

    const ride = await Ride.findOne({ _id: rideId, rider: riderId });
    if (!ride) return res.json(responseData("INVALID_RIDE", {}, req, false));
    if (ride.paymentMethod !== "cash" || ride.status !== "reachedDestination") {
      return res.json(responseData("INVALID_RIDE_STATE", {}, req, false));
    }

    const amountToPay = Number(resolveRideFare(ride, 0).toFixed(2));
    return res.json(responseData("PAYMENT_DUE", { rideId: ride._id, amountToPay, currency: "INR" }, req, true));
  },

  paidPayment: async (req, res) => {
    const riderId = req.user?._id;
    const { rideId } = req.body || {};
    if (!riderId) return res.json(responseData("NOT_AUTHORIZED", {}, req, false));
    if (!rideId) return res.json(responseData("RIDE_ID_REQUIRED", {}, req, false));

    const ride = await Ride.findOne({ _id: rideId, rider: riderId });
    if (!ride) return res.json(responseData("INVALID_RIDE", {}, req, false));
    if (ride.paymentMethod !== "cash" || ride.status !== "reachedDestination") {
      return res.json(responseData("INVALID_RIDE_STATE", {}, req, false));
    }

    ride.cashPaidByUser = true;
    await ride.save();
    return res.json(responseData("PAYMENT_MARKED", { rideId: ride._id }, req, true));
  },

  getScheduledRides: async (req, res) => {
    const userId = req.user._id;

    const rides = await Ride.find({
      rider: userId,
      isScheduled: true,
      status: { $in: ["scheduled", "scheduled_ready", "requested", "accepted", "arrived", "ongoing", "reachedDestination"] }
    }).sort({ scheduledFor: 1 });

    return res.json(responseData("SCHEDULED_RIDES", { rides }, req, true));
  },

  scheduleRide: async (req, res) => {
    try {
      const { rideId } = req.params;
      const { vehicleType, paymentMethod, scheduledFor, promoCode } = req.body;
      const riderId = req.user?._id;

      if (!riderId) {
        return res.json(responseData("NOT_AUTHORIZED", {}, req, false));
      }

      const existingRide = await Ride.findOne({ _id: rideId, rider: riderId });
      if (!existingRide) {
        return res.json(responseData("RIDE_NOT_FOUND", {}, req, false));
      }

      if (!existingRide.pickupLocation?.coordinates || !existingRide.dropLocation?.coordinates) {
        return res.json(responseData("LOCATIONS_REQUIRED", {}, req, false));
      }

      if (!vehicleType) {
        return res.json(responseData("VEHICLE_TYPE_REQUIRED", {}, req, false));
      }

      if (!scheduledFor) {
        return res.json(responseData("SCHEDULED_TIME_REQUIRED", {}, req, false));
      }

      let scheduledTime;
      if (typeof scheduledFor === 'string' && scheduledFor.includes('/')) {
        const dateTimeRegex = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/;
        const match = scheduledFor.trim().match(dateTimeRegex);
        if (!match) {
          return res.json(responseData("INVALID_DATE_FORMAT", {}, req, false));
        }
        const [, day, month, year, hour, minute] = match;
        const dateString = `${year}-${month}-${day}T${hour}:${minute}:00+05:30`;
        scheduledTime = new Date(dateString);
        if (isNaN(scheduledTime.getTime())) {
          return res.json(responseData("INVALID_DATE_FORMAT", {}, req, false));
        }
      } else {
        scheduledTime = new Date(scheduledFor);
        if (isNaN(scheduledTime.getTime())) {
          return res.json(responseData("INVALID_DATE_FORMAT", {}, req, false));
        }
      }

      const now = new Date();
      const minTime = new Date(now.getTime() + 15 * 60 * 1000);
      const maxTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (scheduledTime <= now) {
        return res.json(responseData("SCHEDULED_TIME_PAST", {}, req, false));
      }

      if (scheduledTime < minTime) {
        return res.json(responseData("SCHEDULED_TIME_TOO_SOON", {}, req, false));
      }

      if (scheduledTime > maxTime) {
        return res.json(responseData("SCHEDULED_TIME_TOO_FAR", {}, req, false));
      }

      const [pickupLng, pickupLat] = existingRide.pickupLocation.coordinates;
      const [dropLng, dropLat] = existingRide.dropLocation.coordinates;
      const distance = calculateDistanceInKm(pickupLat, pickupLng, dropLat, dropLng);
      const normalizedVehicleType = vehicleType === "prime sedan" ? "prime-sedan" : vehicleType;

      const etaData = await calculateETA({
        origin: [pickupLng, pickupLat],
        destination: [dropLng, dropLat],
        vehicleType: normalizedVehicleType,
        distanceKm: distance
      }, { useGoogleMaps: false });

      const activeRides = await Ride.find({
        rider: riderId,
        status: { $in: ["requested", "accepted", "arrived", "ongoing", "reachedDestination"] }
      });

      const scheduledRides = await Ride.find({
        rider: riderId,
        isScheduled: true,
        status: { $in: ["scheduled", "scheduled_ready", "requested", "accepted", "arrived", "ongoing", "reachedDestination"] }
      });

      const allRides = [...activeRides, ...scheduledRides];
      const bufferMinutes = 15;

      for (const existingRide of allRides) {
        let existingStartTime, existingEndTime;

        if (existingRide.isScheduled) {
          existingStartTime = existingRide.scheduledFor;
          existingEndTime = new Date(existingStartTime.getTime() + (existingRide.estimatedTime || 0) * 60 * 1000);
        } else {
          existingStartTime = existingRide.createdAt;
          existingEndTime = new Date(existingStartTime.getTime() + (existingRide.estimatedTime || 0) * 60 * 1000);
        }

        const newStartTime = scheduledTime;
        const newEndTime = new Date(scheduledTime.getTime() + etaData.estimatedTime * 60 * 1000);

        const timeDiff1 = Math.abs(newStartTime - existingEndTime) / (1000 * 60);
        const timeDiff2 = Math.abs(newEndTime - existingStartTime) / (1000 * 60);

        if (timeDiff1 < bufferMinutes || timeDiff2 < bufferMinutes) {
          return res.json(responseData("RIDE_TIME_CONFLICT", {}, req, false));
        }
      }

      // Calculate promo discount if promo code is provided
      const fareResult = calculateFare(distance, { vehicleType: normalizedVehicleType });
      const originalFare = Number((fareResult?.estimatedFare || 0).toFixed(2));
      let discountAmount = 0;
      let finalFare = originalFare;
      
      const promoCodeToUse = promoCode || existingRide.promoCode;
      if (promoCodeToUse && originalFare > 0) {
        const discountResult = await calculateDiscount(promoCodeToUse, originalFare);
        if (discountResult.isValid) {
          discountAmount = discountResult.discountAmount;
          finalFare = Math.max(0, Number((originalFare - discountAmount).toFixed(2)));
        }
      }

      const ride = await Ride.findByIdAndUpdate(
        rideId,
        {
          distance: Number(distance.toFixed(2)),
          estimatedFare: [],
          finalFare: finalFare,
          originalFare: originalFare,
          discountAmount: discountAmount,
          vehicleType: normalizedVehicleType,
          paymentMethod: paymentMethod || "cash",
          status: "scheduled",
          isScheduled: true,
          scheduledFor: scheduledTime,
          scheduledAt: now,
          reminderSent: false,
          autoCancelled: false,
          promoCode: promoCodeToUse || null,
          estimatedTime: etaData.estimatedTime
        },
        { new: true }
      );

      if (!ride) {
        return res.json(responseData("RIDE_UPDATE_FAILED", {}, req, false));
      }

      return res.json(responseData("RIDE_SCHEDULED", { ride }, req, true));
    } catch (err) {
      console.error("scheduleRide error:", err);
      return res.json(responseData(err.message || "SERVER_ERROR", {}, req, false));
    }
  },

  rescheduleRide: async (req, res) => {
    try {
      const { rideId } = req.params;
      const { scheduledFor } = req.body;
      const riderId = req.user?._id;

      if (!riderId) {
        return res.json(responseData("NOT_AUTHORIZED", {}, req, false));
      }

      const ride = await Ride.findOne({ _id: rideId, rider: riderId, isScheduled: true });
      if (!ride) {
        return res.json(responseData("RIDE_NOT_FOUND", {}, req, false));
      }

      if (ride.status !== "scheduled") {
        return res.json(responseData("CANNOT_RESCHEDULE_ACTIVE_RIDE", {}, req, false));
      }

      let scheduledTime;
      if (typeof scheduledFor === 'string' && scheduledFor.includes('/')) {
        const dateTimeRegex = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/;
        const match = scheduledFor.trim().match(dateTimeRegex);
        if (!match) {
          return res.json(responseData("INVALID_DATE_FORMAT", {}, req, false));
        }
        const [, day, month, year, hour, minute] = match;
        const dateString = `${year}-${month}-${day}T${hour}:${minute}:00+05:30`;
        scheduledTime = new Date(dateString);
        if (isNaN(scheduledTime.getTime())) {
          return res.json(responseData("INVALID_DATE_FORMAT", {}, req, false));
        }
      } else {
        scheduledTime = new Date(scheduledFor);
        if (isNaN(scheduledTime.getTime())) {
          return res.json(responseData("INVALID_DATE_FORMAT", {}, req, false));
        }
      }

      const now = new Date();
      const minTime = new Date(now.getTime() + 15 * 60 * 1000);
      const maxTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (scheduledTime <= now || scheduledTime < minTime || scheduledTime > maxTime) {
        return res.json(responseData("INVALID_SCHEDULED_TIME", {}, req, false));
      }

      const scheduledRides = await Ride.find({
        rider: riderId,
        _id: { $ne: rideId },
        isScheduled: true,
        status: { $in: ["scheduled", "scheduled_ready", "requested", "accepted", "arrived", "ongoing", "reachedDestination"] }
      });

      const bufferMinutes = 15;
      for (const existingRide of scheduledRides) {
        const existingStartTime = existingRide.scheduledFor;
        const existingEndTime = new Date(existingStartTime.getTime() + (existingRide.estimatedTime || 0) * 60 * 1000);
        const newStartTime = scheduledTime;
        const newEndTime = new Date(scheduledTime.getTime() + ride.estimatedTime * 60 * 1000);

        const timeDiff1 = Math.abs(newStartTime - existingEndTime) / (1000 * 60);
        const timeDiff2 = Math.abs(newEndTime - existingStartTime) / (1000 * 60);

        if (timeDiff1 < bufferMinutes || timeDiff2 < bufferMinutes) {
          return res.json(responseData("RIDE_TIME_CONFLICT", {}, req, false));
        }
      }

      ride.scheduledFor = scheduledTime;
      ride.reminderSent = false;
      await ride.save();

      return res.json(responseData("RIDE_RESCHEDULED", { ride }, req, true));
    } catch (err) {
      console.error("rescheduleRide error:", err);
      return res.json(responseData(err.message || "SERVER_ERROR", {}, req, false));
    }
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
      const ioInstance = _getIo();
      if (ioInstance) {
        const driverSocket = getDriverSocketId(ride.driver.toString());
        if (driverSocket) {
          ioInstance.to(driverSocket).emit("driver:rideCancelled", { ride, cancelledBy: "user" });
        } else {
          ioInstance.to(`driver:${ride.driver}`).emit("driver:rideCancelled", { ride, cancelledBy: "user" });
        }
      }
    }

    sendToUser(riderId.toString(), "user:rideCancelled", {
      ride,
      cancelledBy: "user",
      message: reason || "Ride cancelled by user"
    });

    return res.json(responseData("RIDE_CANCELLED", { ride }, req, true));
  }
};
