const Driver = require("../../models/driver.model");
const { responseData } = require("../../helpers/responseData");

module.exports.goOnline = async (req, res) => {
  try {
    const driverId = req.user?._id;
    const { lat, lng, vehicleType } = req.body;

    if (!lat || !lng) {
      return res.json(responseData("LOCATION_REQUIRED", {}, req, false));
    }

    await Driver.findByIdAndUpdate(driverId, {
      isAvailable: true,
      location: {
        type: "Point",
        coordinates: [lng, lat]
      }
    });

    return res.json(responseData("DRIVER_ONLINE", {}, req, true));
  } catch (err) {
    return res.json(responseData(err.message, {}, req, false));
  }
};
