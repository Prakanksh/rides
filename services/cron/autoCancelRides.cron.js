const Ride = require("../../models/ride.model");
const { sendToUser } = require("../../socket/emitRide");

const AUTO_CANCEL_TIMEOUT_MINUTES = 15;

async function autoCancelRides() {
  try {
    const now = new Date();
    const timeoutThreshold = new Date(now.getTime() - AUTO_CANCEL_TIMEOUT_MINUTES * 60 * 1000);

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
          sendToUser(riderId, {
            event: "rideAutoCancelled",
            ride: {
              _id: ride._id,
              isScheduled: ride.isScheduled || false,
              cancellationReason
            },
            message: ride.isScheduled
              ? "Sorry, no driver was available for your scheduled ride. It has been cancelled."
              : "Sorry, no driver was available for your ride. It has been cancelled."
          });
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

