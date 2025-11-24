const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true
    },

    type: {
      type: String,
      enum: ['two-wheeler', 'auto', 'mini', 'prime-sedan', 'suv'],
      required: true
    },

    number: { type: String, required: true, unique: true }, // Vehicle Number Plate

    model: { type: String }, // Vehicle model name (e.g., Honda City)

    rcNumber: { type: String }, // Registration Certificate No.

    ownerDetails: {
      name: { type: String },
      address: { type: String },
      phoneNumber: { type: String }
    },

    driverIsOwner: {
      type: Boolean,
      default: true
    },

    vehicleAge: { type: Number }, // In years

    isSafetyTested: { type: Boolean, default: false },

    color: { type: String },
    seatingCapacity: { type: Number }, // 2, 3, 4, 6 seats
    insuranceValidTill: { type: Date },
    permitValidTill: { type: Date },
    fitnessValidTill: { type: Date },
    pollutionValidTill: { type: Date },

    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'pending'
    },

    documents: {
      rcImage: { type: String },
      insuranceImage: { type: String },
      pollutionCertImage: { type: String }
    }
  },
  { timestamps: true, versionKey: false }
);

VehicleSchema.index({ type: 1, status: 1, driver: 1 });

module.exports = mongoose.model('Vehicle', VehicleSchema);
