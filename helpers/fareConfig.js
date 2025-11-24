// helpers/fareConfig.js

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

function calculateFare(distanceKm = 0, options = {}) {
  distanceKm = Number(distanceKm) || 0;
  const tip = Number(options.tip) || 0;
  const surge = Number(options.surgeMultiplier) || 1;

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
  const surgedAmount = subtotal * surge;
  const total = surgedAmount + tip;

  return {
    estimatedFare: Number(total.toFixed(2)),
    breakdown: {
      base,
      distanceCharge: Number(distanceCharge.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      surgedAmount: Number(surgedAmount.toFixed(2)),
      surgeMultiplier: surge,
      tip,
      total: Number(total.toFixed(2)),
    },
    currency: defaults.currency
  };
}

module.exports = {
  fareSlabs,
  defaults,
  calculateFare
};
