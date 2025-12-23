const Ride = require("../../models/ride.model");
const User = require("../../models/user.model");
const Notification = require("../../models/notification.model");
const sendNotification = require("../../helpers/firebase-admin");
const { sendToUser } = require("../../socket/emitRide");
const _ = require("lodash");

const AUTO_CANCEL_TIMEOUT_MINUTES = 15;
const Driver = require("../../models/driver.model");

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

async function autoCancelRides() {
  try {
    const now = new Date();
    const timeoutThreshold = new Date(now.getTime() - AUTO_CANCEL_TIMEOUT_MINUTES * 60 * 1000);

    const stuckRides = await Ride.find({
      driver: { $ne: null },
      $or: [
        { status: "accepted", updatedAt: { $lte: new Date(now.getTime() - 30 * 60 * 1000) } },
        { status: "arrived", updatedAt: { $lte: new Date(now.getTime() - 60 * 60 * 1000) } },
        { status: "ongoing", updatedAt: { $lte: new Date(now.getTime() - 120 * 60 * 1000) } },
        { status: "reachedDestination", updatedAt: { $lte: new Date(now.getTime() - 60 * 60 * 1000) } }
      ]
    }).select("_id rider driver").lean();

    const driverIds = [...new Set(stuckRides.map(r => r.driver?.toString()).filter(Boolean))];
    if (driverIds.length > 0) {
      await Driver.updateMany({ _id: { $in: driverIds } }, { $set: { isAvailable: true } });
    }

    for (const ride of stuckRides) {
      await Ride.findByIdAndUpdate(ride._id, {
        status: "cancelled",
        cancelledBy: "system",
        cancelledAt: now,
        cancellationReason: "Ride timeout",
        autoCancelled: true,
        driver: null
      });
      const riderId = ride.rider?.toString() || ride.rider;
      if (riderId) {
        const user = await User.findById(riderId);
        if (user) await sendNotificationAndroidIosUser(user, "Ride Cancelled", "Your ride has been cancelled due to timeout.");
        const cancelledRide = await Ride.findById(ride._id);
        if (cancelledRide) {
          sendToUser(riderId, "user:rideCancelled", { ride: cancelledRide, cancelledBy: "system", message: "Your ride has been cancelled due to timeout." });
        }
      }
    }

    // Cancel rides that have been waiting for a driver for too long
    const normalRidesQuery = {
      isScheduled: false,
      status: "requested",
      driver: null,
      cancelledBy: null,
      updatedAt: { $lte: timeoutThreshold }
    };

    const scheduledRidesQuery = {
      isScheduled: true,
      status: { $in: ["scheduled_ready", "requested"] },
      driver: null,
      autoCancelled: false,
      updatedAt: { $lte: timeoutThreshold }
    };

    const [normalRides, scheduledRides] = await Promise.all([
      Ride.find(normalRidesQuery).select("_id rider").lean(),
      Ride.find(scheduledRidesQuery).select("_id rider isScheduled").lean()
    ]);

    if (normalRides.length === 0 && scheduledRides.length === 0) {
      return;
    }

    const allRideIds = [
      ...normalRides.map(r => r._id),
      ...scheduledRides.map(r => r._id)
    ];

    const cancellationReason = "No driver available";

    const updateResult = await Ride.updateMany(
      {
        _id: { $in: allRideIds },
        status: { $in: ["requested", "scheduled_ready"] },
        driver: null
      },
      {
        $set: {
          status: "cancelled",
          cancelledBy: "system",
          cancelledAt: now,
          cancellationReason,
          autoCancelled: true
        }
      }
    );

    if (updateResult.modifiedCount > 0) {
      const cancelledRides = await Ride.find({
        _id: { $in: allRideIds },
        status: "cancelled",
        cancelledBy: "system"
      }).select("_id rider isScheduled").lean();

      for (const ride of cancelledRides) {
        const riderId = ride.rider?.toString() || ride.rider;
        if (riderId) {
          const user = await User.findById(riderId).select("_id firstName lastName email deviceType deviceToken notifications");
          const message = ride.isScheduled
            ? "Sorry, no driver was available for your scheduled ride. It has been cancelled."
            : "Sorry, no driver was available for your ride. It has been cancelled.";
          
          if (user) {
            await sendNotificationAndroidIosUser(user, "Ride Cancelled", message);
          }

          const cancelledRide = await Ride.findById(ride._id);
          if (cancelledRide) {
            sendToUser(riderId.toString(), "user:rideCancelled", {
              ride: cancelledRide,
              cancelledBy: "system",
              message
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("autoCancelRides error:", error);
  }
}

module.exports = {
  autoCancelRides
};

