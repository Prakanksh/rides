const Rating = require("../models/rating.model");
const Driver = require("../models/driver.model");

/**
 * Returns driver's rating summary and list of all ratings for use in accept-ride payloads.
 * @param {string|ObjectId} driverId
 * @returns {Promise<{ averageRating: number|null, ratingCount: number, ratings: Array<{ rating: number, message?: string, createdAt: Date }> }>}
 */
async function getDriverRatingInfo(driverId) {
  const driver = await Driver.findById(driverId).select("rating ratingCount").lean();
  const ratings = await Rating.find({ driver: driverId })
    .sort({ createdAt: -1 })
    .select("rating message createdAt")
    .lean();
  return {
    averageRating: driver?.rating ?? null,
    ratingCount: driver?.ratingCount ?? 0,
    ratings: ratings.map((r) => ({
      rating: r.rating,
      ...(r.message && { message: r.message }),
      createdAt: r.createdAt
    }))
  };
}

module.exports = { getDriverRatingInfo };
