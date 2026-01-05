const SurgeHeatmap = require("../../models/surgeHeatmap.model");
const { latLngToH3, DEFAULT_HEATMAP_RESOLUTION } = require("../../helpers/h3Util");

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
      .select("surgeMultiplier driverCount requestCount demandSupplyRatio calculatedAt vehicleType")
      .lean();

    if (!surgeData) {
      // No surge data found for this hexagon and vehicle type (might be a new area or vehicle type)
      // Return default surge multiplier
      return {
        surgeMultiplier: 1.0,
        h3Index,
        vehicleType: normalizedVehicleType,
        driverCount: 0,
        requestCount: 0,
        demandSupplyRatio: 0,
        found: false
      };
    }

    // Check if data is too old (older than 10 minutes = stale)
    const now = new Date();
    const dataAge = now - new Date(surgeData.calculatedAt);
    const maxAge = 10 * 60 * 1000; // 10 minutes in milliseconds

    if (dataAge > maxAge) {
      // Data is stale, return default surge
      return {
        surgeMultiplier: 1.0,
        h3Index,
        vehicleType: normalizedVehicleType,
        driverCount: surgeData.driverCount || 0,
        requestCount: surgeData.requestCount || 0,
        demandSupplyRatio: surgeData.demandSupplyRatio || 0,
        found: false,
        stale: true
      };
    }

    // Return surge data
    return {
      surgeMultiplier: surgeData.surgeMultiplier || 1.0,
      h3Index,
      vehicleType: normalizedVehicleType,
      driverCount: surgeData.driverCount || 0,
      requestCount: surgeData.requestCount || 0,
      demandSupplyRatio: surgeData.demandSupplyRatio || 0,
      found: true,
      calculatedAt: surgeData.calculatedAt
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

