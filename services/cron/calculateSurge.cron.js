const Driver = require("../../models/driver.model");
const Ride = require("../../models/ride.model");
const Vehicle = require("../../models/vehicle.model");
const SurgeHeatmap = require("../../models/surgeHeatmap.model");
const { latLngToH3, h3ToLatLng, DEFAULT_HEATMAP_RESOLUTION } = require("../../helpers/h3Util");

// Surge calculation configuration
const SURGE_CONFIG = {
  // H3 resolution for heatmap (9 = ~0.1 km² per hexagon)
  resolution: DEFAULT_HEATMAP_RESOLUTION, // Resolution 9

  // Minimum drivers required to avoid maximum surge
  minDriversForNormalPricing: 1,

  // Surge multiplier thresholds based on demand/supply ratio
  surgeThresholds: [
    { ratio: 0, multiplier: 1.0 },        // No requests = normal pricing
    { ratio: 0.5, multiplier: 1.0 },      // Low demand = normal pricing
    { ratio: 1.0, multiplier: 1.2 },      // Balanced = 20% surge
    { ratio: 1.5, multiplier: 1.5 },      // Medium demand = 50% surge
    { ratio: 2.0, multiplier: 2.0 },      // High demand = 100% surge
    { ratio: 3.0, multiplier: 2.5 },      // Very high demand = 150% surge
    { ratio: Infinity, multiplier: 5.0 }  // Extreme demand = 400% surge (max)
  ],

  // Maximum surge multiplier
  maxSurgeMultiplier: 5.0,

  // Minimum surge multiplier
  minSurgeMultiplier: 1.0
};

/**
 * Calculate surge multiplier based on demand/supply ratio
 * @param {number} driverCount - Number of drivers
 * @param {number} requestCount - Number of ride requests
 * @returns {number} Surge multiplier (1.0 to 5.0)
 */
function calculateSurgeMultiplier(driverCount, requestCount) {
  // If no drivers available, return maximum surge
  if (driverCount === 0) {
    return SURGE_CONFIG.maxSurgeMultiplier;
  }

  // Calculate demand/supply ratio
  const ratio = requestCount / driverCount;

  // Find the appropriate surge multiplier based on thresholds
  for (let i = SURGE_CONFIG.surgeThresholds.length - 1; i >= 0; i--) {
    const threshold = SURGE_CONFIG.surgeThresholds[i];
    if (ratio >= threshold.ratio) {
      return Math.min(threshold.multiplier, SURGE_CONFIG.maxSurgeMultiplier);
    }
  }

  // Default to minimum surge
  return SURGE_CONFIG.minSurgeMultiplier;
}

/**
 * Main function to calculate and store surge heatmap data
 */
async function calculateSurgeHeatmap() {
  try {
    const startTime = Date.now();
    console.log("🔥 Starting surge heatmap calculation...");

    const resolution = SURGE_CONFIG.resolution;

    // Step 1: Get all active/available drivers with their vehicle types
    const activeDrivers = await Driver.find({
      status: "active",
      registrationStatus: "approved",
      isAvailable: true,
      location: {
        $exists: true,
        $ne: null
      },
      "location.coordinates": {
        $exists: true,
        $ne: [0, 0]
      }
    }).select("_id location").lean();

    console.log(`📊 Found ${activeDrivers.length} active drivers`);

    // Step 1.5: Get vehicle types for all active drivers
    const driverIds = activeDrivers.map(d => d._id);
    const activeVehicles = await Vehicle.find({
      driver: { $in: driverIds },
      status: "active"
    }).select("driver type").lean();

    // Create map: driverId -> vehicleType
    const driverVehicleMap = {};
    for (const vehicle of activeVehicles) {
      driverVehicleMap[vehicle.driver.toString()] = vehicle.type;
    }

    // Step 2: Convert driver locations to H3 indices and count per hexagon PER VEHICLE TYPE
    // Structure: driverCountByHex[vehicleType][h3Index] = count
    const driverCountByHex = {
      'two-wheeler': {},
      'auto': {},
      'mini': {},
      'prime-sedan': {},
      'suv': {}
    };
    const hexCenterLocations = {}; // Store center locations for each hex

    for (const driver of activeDrivers) {
      if (driver.location && driver.location.coordinates) {
        const [lng, lat] = driver.location.coordinates; // GeoJSON: [lng, lat]
        const h3Index = latLngToH3(lat, lng, resolution);
        const vehicleType = driverVehicleMap[driver._id.toString()];

        if (h3Index && vehicleType) {
          // Count drivers per hexagon per vehicle type
          if (!driverCountByHex[vehicleType]) {
            driverCountByHex[vehicleType] = {};
          }
          driverCountByHex[vehicleType][h3Index] = (driverCountByHex[vehicleType][h3Index] || 0) + 1;

          // Store center location if not already stored
          if (!hexCenterLocations[h3Index]) {
            const center = h3ToLatLng(h3Index);
            if (center) {
              hexCenterLocations[h3Index] = [center.lng, center.lat]; // GeoJSON: [lng, lat]
            }
          }
        }
      }
    }

    const totalHexagonsWithDrivers = new Set();
    Object.values(driverCountByHex).forEach(hexMap => {
      Object.keys(hexMap).forEach(hex => totalHexagonsWithDrivers.add(hex));
    });
    console.log(`📍 Found ${totalHexagonsWithDrivers.size} unique hexagons with drivers (across all vehicle types)`);

    // Step 3: Get all active ride requests with their vehicle types
    const activeRides = await Ride.find({
      status: { $in: ["requested", "accepted", "ongoing"] },
      pickupLocation: {
        $exists: true,
        $ne: null
      },
      "pickupLocation.coordinates": {
        $exists: true
      },
      vehicleType: { $exists: true, $ne: null }
    }).select("pickupLocation vehicleType").lean();

    console.log(`🚗 Found ${activeRides.length} active ride requests`);

    // Step 4: Convert ride pickup locations to H3 indices and count per hexagon PER VEHICLE TYPE
    // Structure: requestCountByHex[vehicleType][h3Index] = count
    const requestCountByHex = {
      'two-wheeler': {},
      'auto': {},
      'mini': {},
      'prime-sedan': {},
      'suv': {}
    };

    for (const ride of activeRides) {
      if (ride.pickupLocation && ride.pickupLocation.coordinates && ride.vehicleType) {
        const [lng, lat] = ride.pickupLocation.coordinates; // GeoJSON: [lng, lat]
        const h3Index = latLngToH3(lat, lng, resolution);
        // Normalize vehicle type (prime sedan -> prime-sedan)
        const vehicleType = ride.vehicleType === "prime sedan" ? "prime-sedan" : ride.vehicleType;

        if (h3Index && vehicleType && requestCountByHex[vehicleType]) {
          // Count requests per hexagon per vehicle type
          requestCountByHex[vehicleType][h3Index] = (requestCountByHex[vehicleType][h3Index] || 0) + 1;

          // Store center location if not already stored
          if (!hexCenterLocations[h3Index]) {
            const center = h3ToLatLng(h3Index);
            if (center) {
              hexCenterLocations[h3Index] = [center.lng, center.lat]; // GeoJSON: [lng, lat]
            }
          }
        }
      }
    }

    const totalHexagonsWithRequests = new Set();
    Object.values(requestCountByHex).forEach(hexMap => {
      Object.keys(hexMap).forEach(hex => totalHexagonsWithRequests.add(hex));
    });
    console.log(`📍 Found ${totalHexagonsWithRequests.size} unique hexagons with requests (across all vehicle types)`);

    // Step 5: Calculate surge multipliers PER VEHICLE TYPE per hexagon
    const calculatedAt = new Date();
    const surgeData = [];
    const vehicleTypes = ['two-wheeler', 'auto', 'mini', 'prime-sedan', 'suv'];

    // Get all unique hexagons (those with drivers OR requests for any vehicle type)
    const allHexIndices = new Set();
    Object.values(driverCountByHex).forEach(hexMap => {
      Object.keys(hexMap).forEach(hex => allHexIndices.add(hex));
    });
    Object.values(requestCountByHex).forEach(hexMap => {
      Object.keys(hexMap).forEach(hex => allHexIndices.add(hex));
    });

    console.log(`🗺️  Processing ${allHexIndices.size} total hexagons for surge calculation (per vehicle type)`);

    // Step 6: Calculate surge multipliers per vehicle type per hexagon
    for (const h3Index of allHexIndices) {
      // Get center location (use stored one or calculate)
      let centerLocation = hexCenterLocations[h3Index];
      if (!centerLocation) {
        const center = h3ToLatLng(h3Index);
        if (center) {
          centerLocation = [center.lng, center.lat];
        } else {
          continue; // Skip if we can't get center location
        }
      }

      // Calculate surge for each vehicle type in this hexagon
      for (const vehicleType of vehicleTypes) {
        const driverCount = driverCountByHex[vehicleType]?.[h3Index] || 0;
        const requestCount = requestCountByHex[vehicleType]?.[h3Index] || 0;
        const demandSupplyRatio = driverCount > 0 ? requestCount / driverCount : requestCount;
        const surgeMultiplier = calculateSurgeMultiplier(driverCount, requestCount);

        surgeData.push({
          h3Index,
          vehicleType,
          h3Resolution: resolution,
          centerLocation: {
            type: "Point",
            coordinates: centerLocation
          },
          driverCount,
          requestCount,
          demandSupplyRatio: Number(demandSupplyRatio.toFixed(2)),
          surgeMultiplier: Number(surgeMultiplier.toFixed(2)),
          calculatedAt
        });
      }
    }

    // Step 7: Save to database (upsert - update if exists, insert if new)
    // Filter: by h3Index AND vehicleType (so each vehicle type has its own surge per hexagon)
    if (surgeData.length > 0) {
      const bulkOps = surgeData.map(data => ({
        updateOne: {
          filter: { h3Index: data.h3Index, vehicleType: data.vehicleType },
          update: { $set: data },
          upsert: true
        }
      }));

      const result = await SurgeHeatmap.bulkWrite(bulkOps);
      console.log(`✅ Surge heatmap updated: ${result.upsertedCount} new, ${result.modifiedCount} updated (per vehicle type)`);
    }

    const duration = Date.now() - startTime;
    console.log(`⏱️  Surge heatmap calculation completed in ${duration}ms`);

  } catch (error) {
    console.error("❌ Error calculating surge heatmap:", error);
    throw error;
  }
}

module.exports = {
  calculateSurgeHeatmap,
  SURGE_CONFIG
};

