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



// const { calculateFare, defaults } = require("./fareCalculator"); // your current file

// each vehicle type multiplier
const VEHICLE_MULTIPLIERS = {
  "two-wheeler": 0.8,
  "auto": 0.9,
  "mini": 1.0,
  "prime-sedan": 1.2,
  "suv": 1.4
};

const calculateAllVehicleFares = async (distanceKm) => {
  try {
    const surgeMultiplier = 1; // Default surge multiplier
    const tip = 0; // Default tip

    const results = [];

    for (const vehicleType of Object.keys(VEHICLE_MULTIPLIERS)) {

      // 1️⃣ Calculate base fare using your existing function
      const baseFare = calculateFare(distanceKm);

      // 2️⃣ Apply vehicle multiplier
      const vehicleMultiplier = VEHICLE_MULTIPLIERS[vehicleType];
      const vehicleAdjusted = baseFare.breakdown.subtotal * vehicleMultiplier;

      const surgedAmount = vehicleAdjusted * surgeMultiplier;
      const total = surgedAmount + tip;

      // 3️⃣ Build response model for each vehicle
      results.push({
        vehicleType,
        estimatedFare: Number(total.toFixed(2)),

        // breakdown: {
        //   base: baseFare.breakdown.base,
        //   distanceCharge: baseFare.breakdown.distanceCharge,
        //   subtotal: Number(baseFare.breakdown.subtotal.toFixed(2)),

        //   vehicleMultiplier,
        //   vehicleAdjusted: Number(vehicleAdjusted.toFixed(2)),

        //   surgedAmount: Number(surgedAmount.toFixed(2)),
        //   surgeMultiplier,
        //   tip,
        //   total: Number(total.toFixed(2)),
        // },

        // currency: defaults.currency
      });
    }

    return results

  } catch (error) {
    console.error("Fare calculation error:", error);
    // res.status(500).json({
    //   success: false,
    //   message: "Something went wrong.",
    //   error: error.message
    // });
  }
};

module.exports = {
  fareSlabs,
  defaults,
  vehicleMultipliers,
  calculateFare,
  calculateAllVehicleFares
};