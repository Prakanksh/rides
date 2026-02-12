const Ride = require("../../models/ride.model");
const RideChatMessage = require("../../models/rideChatMessage.model");
const { responseData } = require("../../helpers/responseData");

const CHAT_ALLOWED_STATUSES = ["accepted", "arrived", "ongoing"];
const HISTORY_LIMIT = 100;

async function getChatHistory(req, res, requesterType) {
  try {
    const rideId = req.query.rideId;
    const requesterId = req.user?._id;
    if (!rideId || !requesterId) {
      return res.json(responseData("RIDE_ID_REQUIRED", {}, req, false));
    }

    const ride = await Ride.findById(rideId).lean();
    if (!ride) return res.json(responseData("RIDE_NOT_FOUND", {}, req, false));

    const isRider = String(ride.rider) === String(requesterId);
    const isDriver = ride.driver && String(ride.driver) === String(requesterId);
    if (requesterType === "user" && !isRider) return res.json(responseData("INVALID_RIDE", {}, req, false));
    if (requesterType === "driver" && !isDriver) return res.json(responseData("INVALID_RIDE", {}, req, false));

    const messages = await RideChatMessage.find({ ride: rideId })
      .sort({ createdAt: 1 })
      .limit(HISTORY_LIMIT)
      .select("sender senderType text createdAt")
      .lean();

    return res.json(responseData("GET_LIST", messages, req, true));
  } catch (err) {
    return res.json(responseData(err.message || "SOMETHING_WENT_WRONG", {}, req, false));
  }
}

module.exports = { getChatHistory, CHAT_ALLOWED_STATUSES };
