const Driver = require("../../models/driver.model");
const Ride = require("../../models/ride.model");

async function recoverDriverAvailability() {
  try {
    const stuckDrivers = await Driver.find({
      isAvailable: false
    }).select("_id").lean();

    if (stuckDrivers.length === 0) {
      return;
    }

    const driverIds = stuckDrivers.map(d => d._id);
    const activeRides = await Ride.find({
      driver: { $in: driverIds },
      status: { $in: ["requested", "accepted", "arrived", "ongoing", "reachedDestination"] }
    }).select("driver status").lean();

    const driversWithActiveRides = new Set(
      activeRides.map(r => r.driver?.toString()).filter(Boolean)
    );

    const driversToFree = driverIds.filter(
      id => !driversWithActiveRides.has(id.toString())
    );

    if (driversToFree.length > 0) {
      await Driver.updateMany(
        { _id: { $in: driversToFree } },
        { $set: { isAvailable: true } }
      );
    }
  } catch (error) {
    console.error("recoverDriverAvailability error:", error);
  }
}

module.exports = {
  recoverDriverAvailability
};
