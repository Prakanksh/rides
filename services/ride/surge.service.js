const SurgeHeatmap = require("../../models/surgeHeatmap.model");
const { latLngToH3, getH3Neighbors, DEFAULT_HEATMAP_RESOLUTION } = require("../../helpers/h3Util");
const { isValidCoordinate } = require("../../helpers/coordinateValidator");

async function getSurgeMultiplier(lat, lng, vehicleType, resolution = DEFAULT_HEATMAP_RESOLUTION) {
  try {
    if (!isValidCoordinate(lat, lng)) {
      return {
        surgeMultiplier: 1.0,
        h3Index: null,
        vehicleType: vehicleType || null,
        driverCount: 0,
        requestCount: 0,
        demandSupplyRatio: 0,
        found: false
      };
    }

    const normalizedVehicleType = vehicleType === "prime sedan" ? "prime-sedan" : vehicleType;
    const h3Index = latLngToH3(lat, lng, resolution);

    if (!h3Index) {
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

    const surgeData = await SurgeHeatmap.findOne({ 
      h3Index,
      vehicleType: normalizedVehicleType
    })
      .sort({ calculatedAt: -1 })
      .select("surgeMultiplier driverCount requestCount demandSupplyRatio calculatedAt vehicleType h3Index")
      .lean();

    const now = new Date();
    const maxAge = 10 * 60 * 1000;

    let validSurgeData = null;
    if (surgeData) {
      const dataAge = now - new Date(surgeData.calculatedAt);
      if (dataAge <= maxAge) {
        validSurgeData = surgeData;
      }
    }

    if (!validSurgeData) {
      const ring1WithCenter = getH3Neighbors(h3Index, 1);
      const ring1Neighbors = ring1WithCenter.filter(hex => hex !== h3Index);
      
      if (ring1Neighbors.length > 0) {
        const neighborSurgeData = await SurgeHeatmap.find({
          h3Index: { $in: ring1Neighbors },
          vehicleType: normalizedVehicleType,
          calculatedAt: { $gte: new Date(now - maxAge) }
        })
          .sort({ calculatedAt: -1 })
          .select("surgeMultiplier driverCount requestCount demandSupplyRatio calculatedAt vehicleType h3Index")
          .lean();

        if (neighborSurgeData && neighborSurgeData.length > 0) {
          const bestNeighborData = neighborSurgeData[0];
          
          return {
            surgeMultiplier: bestNeighborData.surgeMultiplier || 1.0,
            h3Index,
            neighborH3Index: bestNeighborData.h3Index,
            vehicleType: normalizedVehicleType,
            driverCount: bestNeighborData.driverCount || 0,
            requestCount: bestNeighborData.requestCount || 0,
            demandSupplyRatio: bestNeighborData.demandSupplyRatio || 0,
            found: true,
            fromNeighbor: true,
            calculatedAt: bestNeighborData.calculatedAt
          };
        }
      }
      
      return {
        surgeMultiplier: 1.0,
        h3Index,
        vehicleType: normalizedVehicleType,
        driverCount: 0,
        requestCount: 0,
        demandSupplyRatio: 0,
        found: false,
        stale: surgeData ? true : false
      };
    }

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

  const [lng, lat] = pickupLocation.coordinates;
  return await getSurgeMultiplier(lat, lng, vehicleType);
}

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

