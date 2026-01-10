const SurgeHeatmap = require("../../models/surgeHeatmap.model");
const { latLngToH3, getH3Neighbors, DEFAULT_HEATMAP_RESOLUTION } = require("../../helpers/h3Util");

/**
 * Get surge multiplier for a given location and vehicle type
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} vehicleType - Vehicle type (two-wheeler, auto, mini, prime-sedan, suv)
 * @param {number} resolution - Optional H3 resolution (default: 9 for heatmap)
 * @returns {Promise<Object>} { surgeMultiplier, h3Index, driverCount, requestCount, demandSupplyRatio }
 */
async function getSurgeMultiplier(lat, lng, vehicleType, resolution = DEFAULT_HEATMAP_RESOLUTION) {
  try {
    // Normalize vehicle type (prime sedan -> prime-sedan)
    const normalizedVehicleType = vehicleType === "prime sedan" ? "prime-sedan" : vehicleType;

    // Convert location to H3 hex index
    const h3Index = latLngToH3(lat, lng, resolution);

    if (!h3Index) {
      // If conversion fails, return default surge
      return {
        surgeMultiplier: 1.0,
        h3Index: null,
        vehicleType: normalizedVehicleType,
        driverCount: 0,
        requestCount: 0,
        demandSupplyRatio: 0,
        found: false
      };
    }

    // Find the latest surge data for this hexagon AND vehicle type
    // Sort by calculatedAt descending to get most recent data
    const surgeData = await SurgeHeatmap.findOne({ 
      h3Index,
      vehicleType: normalizedVehicleType
    })
      .sort({ calculatedAt: -1 })
      .select("surgeMultiplier driverCount requestCount demandSupplyRatio calculatedAt vehicleType h3Index")
      .lean();

    const now = new Date();
    const maxAge = 10 * 60 * 1000; // 10 minutes in milliseconds

    // Check if data exists and is fresh
    let validSurgeData = null;
    if (surgeData) {
      const dataAge = now - new Date(surgeData.calculatedAt);
      if (dataAge <= maxAge) {
        validSurgeData = surgeData;
      }
    }

    // If exact hexagon has no valid surge data, check only level 1 (direct) neighbors
    if (!validSurgeData) {
      // Get ring 1 neighbors (direct neighbors only - 6 immediate neighbors)
      // Note: getH3Neighbors(h3Index, 1) returns center + ring 1, so filter out center
      const ring1WithCenter = getH3Neighbors(h3Index, 1); // Includes center + 6 immediate neighbors
      const ring1Neighbors = ring1WithCenter.filter(hex => hex !== h3Index); // Only direct neighbors
      
      if (ring1Neighbors.length > 0) {
        // Find surge data from direct neighbors only
        const neighborSurgeData = await SurgeHeatmap.find({
          h3Index: { $in: ring1Neighbors },
          vehicleType: normalizedVehicleType,
          calculatedAt: { $gte: new Date(now - maxAge) } // Only non-stale data
        })
          .sort({ calculatedAt: -1 })
          .select("surgeMultiplier driverCount requestCount demandSupplyRatio calculatedAt vehicleType h3Index")
          .lean();

        if (neighborSurgeData && neighborSurgeData.length > 0) {
          // Use first available neighbor's surge data (all are equally close - ring 1)
          const bestNeighborData = neighborSurgeData[0];
          
          // Use neighbor's surge data but mark as found from neighbor
          return {
            surgeMultiplier: bestNeighborData.surgeMultiplier || 1.0,
            h3Index, // Original hexagon
            neighborH3Index: bestNeighborData.h3Index, // Hexagon where surge was found
            vehicleType: normalizedVehicleType,
            driverCount: bestNeighborData.driverCount || 0,
            requestCount: bestNeighborData.requestCount || 0,
            demandSupplyRatio: bestNeighborData.demandSupplyRatio || 0,
            found: true,
            fromNeighbor: true, // Flag to indicate data came from neighbor
            calculatedAt: bestNeighborData.calculatedAt
          };
        }
      }
      
      // No surge data found in exact hexagon or direct neighbors - return 1.0x
      return {
        surgeMultiplier: 1.0,
        h3Index,
        vehicleType: normalizedVehicleType,
        driverCount: 0,
        requestCount: 0,
        demandSupplyRatio: 0,
        found: false,
        stale: surgeData ? true : false // Mark as stale if data existed but was old
      };
    }

    // Return surge data from exact hexagon (data is fresh)
    return {
      surgeMultiplier: validSurgeData.surgeMultiplier || 1.0,
      h3Index,
      vehicleType: normalizedVehicleType,
      driverCount: validSurgeData.driverCount || 0,
      requestCount: validSurgeData.requestCount || 0,
      demandSupplyRatio: validSurgeData.demandSupplyRatio || 0,
      found: true,
      calculatedAt: validSurgeData.calculatedAt
    };

  } catch (error) {
    console.error("Error getting surge multiplier:", error);
    // Return default surge on error
    return {
      surgeMultiplier: 1.0,
      h3Index: null,
      vehicleType: vehicleType || null,
      driverCount: 0,
      requestCount: 0,
      demandSupplyRatio: 0,
      found: false,
      error: error.message
    };
  }
}

/**
 * Get surge multiplier for pickup location and vehicle type (used when creating rides)
 * @param {Object} pickupLocation - GeoJSON Point with coordinates [lng, lat]
 * @param {string} vehicleType - Vehicle type (two-wheeler, auto, mini, prime-sedan, suv)
 * @returns {Promise<Object>} Surge multiplier data
 */
async function getSurgeForPickupLocation(pickupLocation, vehicleType) {
  if (!pickupLocation || !pickupLocation.coordinates) {
    return {
      surgeMultiplier: 1.0,
      found: false,
      error: "Invalid pickup location"
    };
  }

  if (!vehicleType) {
    return {
      surgeMultiplier: 1.0,
      found: false,
      error: "Vehicle type is required"
    };
  }

  const [lng, lat] = pickupLocation.coordinates; // GeoJSON: [lng, lat]
  return await getSurgeMultiplier(lat, lng, vehicleType);
}

/**
 * Get surge multipliers for multiple locations (batch query)
 * @param {Array<Object>} locations - Array of { lat, lng } objects
 * @returns {Promise<Array<Object>>} Array of surge multiplier data
 */
async function getSurgeMultipliersBatch(locations) {
  try {
    const results = await Promise.all(
      locations.map(loc => getSurgeMultiplier(loc.lat, loc.lng))
    );
    return results;
  } catch (error) {
    console.error("Error getting surge multipliers batch:", error);
    // Return default surge for all locations on error
    return locations.map(() => ({
      surgeMultiplier: 1.0,
      found: false,
      error: error.message
    }));
  }
}

module.exports = {
  getSurgeMultiplier,
  getSurgeForPickupLocation,
  getSurgeMultipliersBatch
};

