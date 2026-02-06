const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema(
  {
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    rider: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, default: '', trim: true }
  },
  { timestamps: true, versionKey: false }
);

RatingSchema.index({ driver: 1, createdAt: -1 });
RatingSchema.index({ driver: 1, rider: 1 });

module.exports = mongoose.model('Rating', RatingSchema);
