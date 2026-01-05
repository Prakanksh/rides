const mongoose = require('mongoose');

const SurgeHeatmapSchema = new mongoose.Schema(
  {
    // H3 hex index - identifies which hexagon this data is for
    h3Index: {
      type: String,
      required: true,
      index: true
    },

    // Vehicle type - surge is calculated per vehicle type
    // (two-wheeler, auto, mini, prime-sedan, suv)
    vehicleType: {
      type: String,
      enum: ['two-wheeler', 'auto', 'mini', 'prime-sedan', 'suv'],
      required: true,
      index: true
    },

    // H3 resolution level (for validation and queries)
    h3Resolution: {
      type: Number,
      required: true,
      default: 9,
      min: 0,
      max: 15
    },

    // Center coordinates of the hexagon (for map visualization)
    centerLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude] - GeoJSON format
        required: true
      }
    },

    // Count of active/available drivers in this hexagon
    driverCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },

    // Count of active ride requests in this hexagon
    // (rides in status: requested, accepted, ongoing)
    requestCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },

    // Demand/Supply ratio (requests / drivers)
    // Higher ratio = more demand than supply = higher surge
    demandSupplyRatio: {
      type: Number,
      default: 0,
      min: 0
    },

    // Calculated surge multiplier (e.g., 1.0 = normal, 1.5 = 50% surge, 2.0 = 100% surge)
    surgeMultiplier: {
      type: Number,
      required: true,
      default: 1.0,
      min: 1.0,
      max: 5.0
    },

    // Timestamp when this data was calculated
    calculatedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true, versionKey: false }
);

// Compound index on h3Index, vehicleType and calculatedAt for efficient queries
// This allows fast lookup of latest surge data for a hexagon and vehicle type
SurgeHeatmapSchema.index({ h3Index: 1, vehicleType: 1, calculatedAt: -1 });

// Index on calculatedAt for cleanup queries (delete old data)
SurgeHeatmapSchema.index({ calculatedAt: -1 });

// Index on surgeMultiplier for filtering high-surge areas
SurgeHeatmapSchema.index({ surgeMultiplier: -1 });

// Index on centerLocation for spatial queries
SurgeHeatmapSchema.index({ centerLocation: '2dsphere' });

// Compound index for finding hexagons with surge above threshold
SurgeHeatmapSchema.index({ surgeMultiplier: -1, calculatedAt: -1 });

module.exports = mongoose.model('SurgeHeatmap', SurgeHeatmapSchema);

