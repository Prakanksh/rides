const Driver = require("../../models/driver.model");

module.exports.findBestDriver = async (pickupLocation, vehicleType) => {
  try {
    const [lat, lng] = pickupLocation.coordinates;

    // Search radius (5 km)
    const radiusInMeters = 5 * 1000;

    // STEP 1 — Find nearest approved + active + available drivers
    const drivers = await Driver.find({
      isAvailable: true,
      registrationStatus: "approved",
      status: "active",
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat] // GeoJSON format
          },
          $maxDistance: radiusInMeters
        }
      }
    }).limit(5); // keep top 5 for future ranking improvement

    if (!drivers.length) return null;

    // STEP 2 — Future ranking criteria
    // For now: just return nearest
    return drivers[0];

  } catch (err) {
    console.error("Driver Assignment Error:", err);
    return null;
  }
};
