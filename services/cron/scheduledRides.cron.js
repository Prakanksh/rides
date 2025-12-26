const Ride = require("../../models/ride.model");
const Driver = require("../../models/driver.model");
const Vehicle = require("../../models/vehicle.model");
const User = require("../../models/user.model");
const Notification = require("../../models/notification.model");
const sendNotification = require("../../helpers/firebase-admin");
const { sendRideToDriver, sendToUser } = require("../../socket/emitRide");
const _ = require("lodash");

async function sendNotificationAndroidIosUser(receiverUser, title, description) {
  await Notification.create({
    userId: receiverUser?._id,
    userType: "user",
    title,
    description
  });
  // Firebase push notifications commented out for now
  // if (receiverUser?.deviceType === "android" && receiverUser?.notifications) {
  //   if (!_.isEmpty(receiverUser?.deviceToken)) {
  //     const messages = [
  //       {
  //         data: {
  //           title: title,
  //           body: description
  //         },
  //         token: receiverUser?.deviceToken,
  //         android: { ttl: 10, priority: "high" }
  //       }
  //     ];
  //     await sendNotification.sendNotifications(messages);
  //   }
  // }
  // if (receiverUser?.deviceType === "ios" && receiverUser?.notifications) {
  //   if (!_.isEmpty(receiverUser?.deviceToken)) {
  //     const messages = [
  //       {
  //         notification: {
  //           title: title,
  //           body: description
  //         },
  //         apns: {
  //           payload: {
  //             aps: {
  //               sound: "default"
  //             }
  //           }
  //         },
  //         token: receiverUser?.deviceToken,
  //         android: { ttl: 10, priority: "high" }
  //       }
  //     ];
  //     await sendNotification.sendNotifications(messages);
  //   }
  // }
}

async function activateScheduledRides() {
  try {
    const now = new Date();
    const activationTime = new Date(now.getTime() + 5 * 60 * 1000);

    const ridesToActivate = await Ride.find({
      isScheduled: true,
      status: "scheduled",
      scheduledFor: { $lte: activationTime },
      autoCancelled: false
    }).populate({ path: "rider", model: "users", select: "_id status" });

    for (const ride of ridesToActivate) {
      if (!ride.rider || (ride.rider.status && ride.rider.status !== "active")) {
        ride.status = "cancelled";
        ride.cancelledBy = "system";
        ride.cancelledAt = new Date();
        ride.cancellationReason = "User account inactive";
        ride.autoCancelled = true;
        await ride.save();
        
        const riderId = ride.rider?._id || ride.rider;
        if (riderId) {
          const user = await User.findById(riderId).select("_id firstName lastName email deviceType deviceToken notifications");
          if (user) {
            await sendNotificationAndroidIosUser(user, "Scheduled Ride Cancelled", "Your scheduled ride has been cancelled because your account is inactive.");
          }
        }
        continue;
      }

      const riderId = ride.rider._id || ride.rider;
      const activeRide = await Ride.findOne({
        rider: riderId,
        _id: { $ne: ride._id },
        status: { $in: ["requested", "accepted", "arrived", "ongoing", "reachedDestination"] }
      });

      if (activeRide) {
        continue;
      }

      const otherScheduledRides = await Ride.find({
        rider: riderId,
        _id: { $ne: ride._id },
        isScheduled: true,
        status: { $in: ["scheduled", "scheduled_ready", "requested", "accepted", "arrived", "ongoing", "reachedDestination"] }
      });

      const bufferMinutes = 15;
      const currentRideStartTime = ride.scheduledFor;
      const currentRideEndTime = new Date(currentRideStartTime.getTime() + (ride.estimatedTime || 0) * 60 * 1000);

      let hasTimeConflict = false;
      for (const otherRide of otherScheduledRides) {
        const otherRideStartTime = otherRide.scheduledFor;
        const otherRideEndTime = new Date(otherRideStartTime.getTime() + (otherRide.estimatedTime || 0) * 60 * 1000);

        const timeDiff1 = Math.abs(currentRideStartTime.getTime() - otherRideEndTime.getTime()) / (1000 * 60);
        const timeDiff2 = Math.abs(currentRideEndTime.getTime() - otherRideStartTime.getTime()) / (1000 * 60);

        if (timeDiff1 < bufferMinutes || timeDiff2 < bufferMinutes) {
          hasTimeConflict = true;
          break;
        }
      }

      if (hasTimeConflict) {
        continue; 
      }

      ride.status = "scheduled_ready";
      await ride.save();

      const normalizedVehicleType = ride.vehicleType === "prime sedan" ? "prime-sedan" : ride.vehicleType;
      const vehicles = await Vehicle.find({
        type: normalizedVehicleType,
        status: "active"
      }).select("driver").lean();

      const driverIds = vehicles.map(v => v.driver);
      if (driverIds.length === 0) {
        ride.status = "cancelled";
        ride.cancelledBy = "system";
        ride.cancelledAt = new Date();
        ride.cancellationReason = `No ${normalizedVehicleType} drivers available`;
        ride.autoCancelled = true;
        await ride.save();

        const user = await User.findById(riderId).select("_id firstName lastName email deviceType deviceToken notifications");
        if (user) {
          await sendNotificationAndroidIosUser(user, "Scheduled Ride Cancelled", `Your scheduled ride has been cancelled because no ${normalizedVehicleType} drivers are available.`);
        }

        sendToUser(riderId.toString(), "user:scheduledRideCancelled", {
          ride: ride,
          message: `Your scheduled ride has been cancelled because no ${normalizedVehicleType} drivers are available.`
        });
        continue;
      }

      const [pickupLng, pickupLat] = ride.pickupLocation.coordinates;
      const nearbyDrivers = await Driver.find({
        _id: { $in: driverIds },
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

      if (nearbyDrivers.length > 0) {
        const activeRideCheck = await Ride.findOne({
          rider: riderId,
          _id: { $ne: ride._id },
          status: { $in: ["requested", "accepted", "arrived", "ongoing", "reachedDestination"] }
        });

        if (activeRideCheck) {
          continue; 
        }

        ride.status = "requested";
        await ride.save();

        nearbyDrivers.forEach(driver => {
          sendRideToDriver(driver._id.toString(), ride);
        });

        const user = await User.findById(riderId).select("_id firstName lastName email deviceType deviceToken notifications");
        if (user) {
          await sendNotificationAndroidIosUser(user, "Scheduled Ride Activated", "Your scheduled ride is now active. Driver matching has started.");
        }

        sendToUser(riderId.toString(), "user:scheduledRideActivated", {
          ride: ride,
          message: "Your scheduled ride is now active. Driver matching has started."
        });
      }
    }
  } catch (error) {
    console.error("activateScheduledRides error:", error);
  }
}

module.exports = {
  activateScheduledRides
};

