// // helpers/fareConfig.js

// const fareSlabs = [
//   { upTo: 2, baseFare: 30, perKm: 10 },
//   { upTo: 5, baseFare: 50, perKm: 9 },
//   { upTo: 10, baseFare: 80, perKm: 8 },
//   { upTo: 99999, baseFare: 130, perKm: 7 }
// ];

// const defaults = {
//   minimumFare: 25,
//   currency: "INR"
// };

// function calculateFare(distanceKm = 0, options = {}) {
//   distanceKm = Number(distanceKm) || 0;
//   const tip = Number(options.tip) || 0;
//   const surge = Number(options.surgeMultiplier) || 1;

//   let previousLimit = 0;
//   let base = 0;
//   let distanceCharge = 0;

//   for (let i = 0; i < fareSlabs.length; i++) {
//     const slab = fareSlabs[i];

//     if (distanceKm <= slab.upTo) {
//       base = slab.baseFare;
//       const chargeableKm = Math.max(0, distanceKm - previousLimit);
//       distanceCharge = chargeableKm * slab.perKm;
//       break;
//     }

//     previousLimit = slab.upTo;
//   }

//   let subtotal = base + distanceCharge;
//   subtotal = Math.max(subtotal, defaults.minimumFare);
//   const surgedAmount = subtotal * surge;
//   const total = surgedAmount + tip;

//   return {
//     estimatedFare: Number(total.toFixed(2)),
//     breakdown: {
//       base,
//       distanceCharge: Number(distanceCharge.toFixed(2)),
//       subtotal: Number(subtotal.toFixed(2)),
//       surgedAmount: Number(surgedAmount.toFixed(2)),
//       surgeMultiplier: surge,
//       tip,
//       total: Number(total.toFixed(2)),
//     },
//     currency: defaults.currency
//   };
// }

// module.exports = {
//   fareSlabs,
//   defaults,
//   calculateFare
// };



const fareSlabs = [
  { upTo: 2, baseFare: 30, perKm: 10 },
  { upTo: 5, baseFare: 50, perKm: 9 },
  { upTo: 10, baseFare: 80, perKm: 8 },
  { upTo: 99999, baseFare: 130, perKm: 7 }
];

const defaults = {
  minimumFare: 25,
  currency: "INR"
};

const vehicleMultipliers = {
  "two-wheeler": 0.7,
  "auto": 0.85,
  "mini": 1,
  "prime-sedan": 1.25,
  "suv": 1.5
};

function calculateFare(distanceKm = 0, options = {}) {
  distanceKm = Number(distanceKm) || 0;
  const tip = Number(options.tip) || 0;
  const surge = Number(options.surgeMultiplier) || 1;

  const vehicleType = options.vehicleType || "mini";
  const vehicleMultiplier = vehicleMultipliers[vehicleType] || 1;

  let previousLimit = 0;
  let base = 0;
  let distanceCharge = 0;

  for (let i = 0; i < fareSlabs.length; i++) {
    const slab = fareSlabs[i];

    if (distanceKm <= slab.upTo) {
      base = slab.baseFare;
      const chargeableKm = Math.max(0, distanceKm - previousLimit);
      distanceCharge = chargeableKm * slab.perKm;
      break;
    }

    previousLimit = slab.upTo;
  }

  let subtotal = base + distanceCharge;
  subtotal = Math.max(subtotal, defaults.minimumFare);

  // 👉 Apply vehicle multiplier
  const vehicleAdjusted = subtotal * vehicleMultiplier;

  // 👉 Apply surge
  const surgedAmount = vehicleAdjusted * surge;

  const total = surgedAmount + tip;

  return {
    vehicleType,
    estimatedFare: Number(total.toFixed(2)),
    breakdown: {
      base,
      distanceCharge: Number(distanceCharge.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      vehicleMultiplier,
      vehicleAdjusted: Number(vehicleAdjusted.toFixed(2)),
      surgedAmount: Number(surgedAmount.toFixed(2)),
      surgeMultiplier: surge,
      tip,
      total: Number(total.toFixed(2)),
    },
    currency: defaults.currency
  };
}



const calculateAllVehicleFares = async (distanceKm, pickupLocation = null) => {
  try {
    const tip = 0; // Default tip

    // Import surge service (lazy import to avoid circular dependency)
    let getSurgeForPickupLocation;
    try {
      const surgeService = require("../services/ride/surge.service");
      getSurgeForPickupLocation = surgeService.getSurgeForPickupLocation;
    } catch (err) {
      console.warn("Surge service not available, using default surge multiplier");
    }

    const results = [];

    for (const vehicleType of Object.keys(vehicleMultipliers)) {
      // Get surge multiplier for this vehicle type and pickup location
      let surgeMultiplier = 1.0; // Default surge
      
      if (pickupLocation && getSurgeForPickupLocation) {
        try {
          const surgeData = await getSurgeForPickupLocation(pickupLocation, vehicleType);
          surgeMultiplier = surgeData.surgeMultiplier || 1.0;
        } catch (error) {
          console.error(`Error getting surge for ${vehicleType}:`, error);
          // Use default surge on error
          surgeMultiplier = 1.0;
        }
      }

      // 1️⃣ Calculate base fare using your existing function
      const baseFare = calculateFare(distanceKm, {
        vehicleType,
        surgeMultiplier,
        tip
      });

      // 2️⃣ Build response model for each vehicle
      results.push({
        vehicleType,
        estimatedFare: baseFare.estimatedFare,
        surgeMultiplier: Number(surgeMultiplier.toFixed(2)),
        breakdown: baseFare.breakdown
      });
    }

    return results

  } catch (error) {
    console.error("Fare calculation error:", error);
    // Fallback: return fares without surge if error occurs
    const results = [];
    for (const vehicleType of Object.keys(vehicleMultipliers)) {
      const baseFare = calculateFare(distanceKm, { vehicleType });
      results.push({
        vehicleType,
        estimatedFare: baseFare.estimatedFare,
        surgeMultiplier: 1.0,
        breakdown: baseFare.breakdown
      });
    }
    return results;
  }
};

module.exports = {
  fareSlabs,
  defaults,
  vehicleMultipliers,
  calculateFare,
  calculateAllVehicleFares
};