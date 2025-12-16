const Ride = require("../../models/ride.model");
const Driver = require("../../models/driver.model");
const Vehicle = require("../../models/vehicle.model");
const User = require("../../models/user.model");
const { sendRideToDriver, sendToUser } = require("../../socket/emitRide");

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

      ride.status = "scheduled_ready";
      ride.scheduledReadyAt = new Date();
      await ride.save();

      const normalizedVehicleType = ride.vehicleType === "prime sedan" ? "prime-sedan" : ride.vehicleType;
      const vehicles = await Vehicle.find({
        type: normalizedVehicleType,
        status: "active"
      }).select("driver").lean();

      const driverIds = vehicles.map(v => v.driver);
      if (driverIds.length === 0) {
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
        ride.status = "requested";
        await ride.save();

        nearbyDrivers.forEach(driver => {
          sendRideToDriver(driver._id.toString(), ride);
        });

        sendToUser(riderId.toString(), {
          event: "scheduledRideActivated",
          ride
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

