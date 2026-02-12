const Ride = require("../models/ride.model");
const Driver = require("../models/driver.model");
const Vehicle = require("../models/vehicle.model");
const User = require("../models/user.model");
const AdminSetting = require("../models/adminSetting.model");
const { ensureWallets, payByWallet, payByCash, confirmCashPayment, resolveRideFare } = require("../helpers/walletUtil");
const { latLngToH3, H3_RESOLUTION } = require("../helpers/h3Util");
const { isValidCoordinate } = require("../helpers/coordinateValidator");
const { getDriverRatingInfo } = require("../helpers/ratingUtil");
const RideChatMessage = require("../models/rideChatMessage.model");
const RideCall = require("../models/rideCall.model");
const { CHAT_ALLOWED_STATUSES } = require("../services/ride/rideChat.service");
const { generateRtcToken } = require("../helpers/agora");
let ioInstance = null;

const RIDE_CALL_CHANNEL_PREFIX = "call_ride_";

async function getRideAndCaller(rideId, socket) {
  if (!rideId || !socket) return null;
  const ride = await Ride.findById(rideId).select("rider driver status").lean();
  if (!ride || !CHAT_ALLOWED_STATUSES.includes(ride.status)) return null;
  const isRider = socket.rideUserId && String(ride.rider) === String(socket.rideUserId);
  const isDriver = socket.driverId && ride.driver && String(ride.driver) === String(socket.driverId);
  if (isRider) return { ride, callerId: ride.rider, callerType: "rider", receiverId: ride.driver };
  if (isDriver) return { ride, callerId: ride.driver, callerType: "driver", receiverId: ride.rider };
  return null;
}

const {
  addDriverSocket,
  removeDriverSocketBySocketId,
  getDriverSocketId,
  addUserSocket,
  removeUserSocketBySocketId,
  getUserSocketId,
  updateDriverLocation
} = require("./driverSocketMap");

function initSocketIO(io) {

  ioInstance = io;

  io.on("connection", (socket) => {
    socket.on("driver:online", async (driverId) => {
      try {
        addDriverSocket(driverId, socket.id);
        socket.join(`driver:${driverId}`);
        socket.driverId = driverId;
        const activeRide = await Ride.findOne({
          driver: driverId,
          status: { $in: ["accepted", "arrived", "ongoing", "reachedDestination"] }
        }).select("_id").lean();
        if (activeRide) socket.join(`ride:${activeRide._id}`);
        socket.emit("driver:online:ack", { ok: true });
      } catch (e) { console.error("driver:online err", e); }
    });

    socket.on("user:connect", (userId) => {
      try {
        addUserSocket(userId, socket.id);
        socket.join(`user:${userId}`);
        socket.rideUserId = userId;
        socket.emit("user:connect:ack", { ok: true });
      } catch (e) { console.error("user:connect err", e); }
    });

    /* --------------------- Ride chat: join room --------------------- */
    socket.on("ride:joinRoom", async (rideId) => {
      try {
        if (!rideId || !ioInstance) return;
        const ride = await Ride.findById(rideId).select("rider driver status").lean();
        if (!ride) return socket.emit("ride:joinRoom:response", { success: false, message: "RIDE_NOT_FOUND" });
        if (!CHAT_ALLOWED_STATUSES.includes(ride.status)) return socket.emit("ride:joinRoom:response", { success: false, message: "CHAT_NOT_AVAILABLE" });
        const isRider = socket.rideUserId && String(ride.rider) === String(socket.rideUserId);
        const isDriver = socket.driverId && ride.driver && String(ride.driver) === String(socket.driverId);
        if (!isRider && !isDriver) return socket.emit("ride:joinRoom:response", { success: false, message: "INVALID_RIDE" });
        socket.join(`ride:${rideId}`);
        socket.emit("ride:joinRoom:response", { success: true, rideId });
      } catch (e) { console.error("ride:joinRoom err", e); socket.emit("ride:joinRoom:response", { success: false, message: "SERVER_ERROR" }); }
    });

    /* --------------------- Ride chat: send message --------------------- */
    socket.on("ride:sendMessage", async ({ rideId, text }) => {
      try {
        if (!rideId || text == null || text === "" || !ioInstance) return socket.emit("ride:sendMessage:response", { success: false, message: "INVALID_PAYLOAD" });
        const trimmed = String(text).trim();
        if (!trimmed) return socket.emit("ride:sendMessage:response", { success: false, message: "TEXT_REQUIRED" });
        const ride = await Ride.findById(rideId).select("rider driver status").lean();
        if (!ride) return socket.emit("ride:sendMessage:response", { success: false, message: "RIDE_NOT_FOUND" });
        if (!CHAT_ALLOWED_STATUSES.includes(ride.status)) return socket.emit("ride:sendMessage:response", { success: false, message: "CHAT_NOT_AVAILABLE" });
        let senderId = null;
        let senderType = null;
        if (socket.rideUserId && String(ride.rider) === String(socket.rideUserId)) {
          senderId = socket.rideUserId;
          senderType = "user";
        } else if (socket.driverId && ride.driver && String(ride.driver) === String(socket.driverId)) {
          senderId = socket.driverId;
          senderType = "driver";
        }
        if (!senderId || !senderType) return socket.emit("ride:sendMessage:response", { success: false, message: "INVALID_RIDE" });
        const doc = await RideChatMessage.create({ ride: rideId, sender: senderId, senderType, text: trimmed });
        const msg = { _id: doc._id, ride: doc.ride, sender: doc.sender, senderType: doc.senderType, text: doc.text, createdAt: doc.createdAt };
        ioInstance.to(`ride:${rideId}`).emit("ride:receiveMessage", msg);
        socket.emit("ride:sendMessage:response", { success: true, message: msg });
      } catch (e) { console.error("ride:sendMessage err", e); socket.emit("ride:sendMessage:response", { success: false, message: "SERVER_ERROR" }); }
    });

    //  --------------------- Ride audio call --------------------- 
    socket.on("ride:startAudioCall", async (payload) => {
      try {
        const { rideId } = payload || {};
        if (!rideId || !ioInstance) return socket.emit("ride:audioCall:response", { success: false, message: "INVALID_PAYLOAD" });
        const ctx = await getRideAndCaller(rideId, socket);
        if (!ctx) return socket.emit("ride:audioCall:response", { success: false, message: "INVALID_RIDE_OR_STATE" });
        const { ride, callerId, callerType, receiverId } = ctx;
        const channel = RIDE_CALL_CHANNEL_PREFIX + rideId;
        let callerToken;
        try {
          callerToken = generateRtcToken(channel, 0);
        } catch (err) {
          console.error("ride:startAudioCall token err", err);
          return socket.emit("ride:audioCall:response", { success: false, message: "TOKEN_ERROR" });
        }
        const callDoc = await RideCall.create({
          ride: rideId,
          callerId,
          callerType,
          channel,
          status: "ringing"
        });
        const callId = callDoc._id.toString();
        const payloadToRoom = {
          rideId,
          callId,
          channel,
          callerId: callerId.toString(),
          callerType,
          receiverId: receiverId ? receiverId.toString() : null,
          callerToken
        };
        ioInstance.to(`ride:${rideId}`).emit("ride:incomingAudioCall", payloadToRoom);
        socket.emit("ride:audioCall:response", { success: true, callId });
      } catch (e) { console.error("ride:startAudioCall err", e); socket.emit("ride:audioCall:response", { success: false, message: "SERVER_ERROR" }); }
    });

    socket.on("ride:acceptAudioCall", async (payload) => {
      try {
        const { rideId, callId } = payload || {};
        if (!rideId || !callId || !ioInstance) return socket.emit("ride:audioCall:response", { success: false, message: "INVALID_PAYLOAD" });
        const ctx = await getRideAndCaller(rideId, socket);
        if (!ctx) return socket.emit("ride:audioCall:response", { success: false, message: "INVALID_RIDE_OR_STATE" });
        const callDoc = await RideCall.findOne({ _id: callId, ride: rideId, status: "ringing" });
        if (!callDoc) return socket.emit("ride:audioCall:response", { success: false, message: "CALL_NOT_FOUND_OR_ENDED" });
        const callerToken = generateRtcToken(callDoc.channel, 0);
        const receiverToken = generateRtcToken(callDoc.channel, 1);
        callDoc.status = "accepted";
        callDoc.startTime = new Date();
        await callDoc.save();
        const payloadToRoom = {
          rideId,
          callId,
          channel: callDoc.channel,
          callerToken,
          receiverToken
        };
        ioInstance.to(`ride:${rideId}`).emit("ride:audioCallAccepted", payloadToRoom);
        socket.emit("ride:audioCall:response", { success: true });
      } catch (e) { console.error("ride:acceptAudioCall err", e); socket.emit("ride:audioCall:response", { success: false, message: "SERVER_ERROR" }); }
    });

    socket.on("ride:rejectAudioCall", async (payload) => {
      try {
        const { rideId, callId } = payload || {};
        if (!rideId || !callId || !ioInstance) return;
        const ctx = await getRideAndCaller(rideId, socket);
        if (!ctx) return;
        const callDoc = await RideCall.findOne({ _id: callId, ride: rideId });
        if (callDoc && callDoc.status === "ringing") {
          callDoc.status = "rejected";
          callDoc.endTime = new Date();
          callDoc.duration = 0;
          await callDoc.save();
          ioInstance.to(`ride:${rideId}`).emit("ride:audioCallRejected", { rideId, callId });
        }
      } catch (e) { console.error("ride:rejectAudioCall err", e); }
    });

    socket.on("ride:endAudioCall", async (payload) => {
      try {
        const { rideId, callId } = payload || {};
        if (!rideId || !callId || !ioInstance) return;
        const ctx = await getRideAndCaller(rideId, socket);
        if (!ctx) return;
        const callDoc = await RideCall.findOne({ _id: callId, ride: rideId });
        if (callDoc && callDoc.status !== "ended" && callDoc.status !== "rejected") {
          const now = new Date();
          callDoc.status = "ended";
          callDoc.endTime = now;
          callDoc.duration = callDoc.startTime
            ? Math.round((now - callDoc.startTime) / 1000)
            : 0;
          await callDoc.save();
          ioInstance.to(`ride:${rideId}`).emit("ride:audioCallEnded", { rideId, callId, duration: callDoc.duration });
        }
      } catch (e) { console.error("ride:endAudioCall err", e); }
    });

    socket.on("driver:location", async (data) => {
      try {
        const { driverId, lat, lng } = data || {};
        if (!driverId || !isValidCoordinate(lat, lng)) return;
        
        updateDriverLocation(driverId, lat, lng);
        const h3Index = latLngToH3(lat, lng, H3_RESOLUTION.NEIGHBORHOOD || 9);
        
        Driver.findByIdAndUpdate(
          driverId,
          {
            location: {
              type: "Point",
              coordinates: [lng, lat]
            },
            h3Index: h3Index
          },
          { new: true }
        ).catch(err => {
          console.error("Error updating driver location in database:", err);
        });
        
        const activeRide = await Ride.findOne({
          driver: driverId,
          status: { $in: ["accepted", "arrived", "ongoing", "reachedDestination"] }
        }).select("rider _id status");

        if (activeRide && activeRide.rider) {
          const riderSocket = getUserSocketId(activeRide.rider);
          const payload = { rideId: activeRide._id, driverId, lat, lng, ts: new Date() };
          if (riderSocket && ioInstance) {
            ioInstance.to(riderSocket).emit("driver:location", payload);
          } else {
            ioInstance.to(`user:${activeRide.rider}`).emit("driver:location", payload);
          }
        }
      } catch (e) { console.error("driver:location err", e); }
    });

    socket.on("ride:accept", async (payload) => {
      try {
        const { rideId, driverId } = payload || {};
        if (!rideId || !driverId) {
          socket.emit("ride:accept:response", { success: false, message: "INVALID_PAYLOAD" });
          return;
        }
        const otp = String(Math.floor(1000 + Math.random() * 9000));
        
        // Use atomic update to prevent race condition - only update if status is "requested" and driver is null
        const ride = await Ride.findOneAndUpdate(
          { 
            _id: rideId, 
            status: "requested",
            driver: null
          },
          { 
            driver: driverId,
            status: "accepted",
            otpForRideStart: otp,
            updatedAt: new Date()
          },
          { new: true }
        );
        
        if (!ride) { 
          // Check if ride exists but was already accepted
          const existingRide = await Ride.findById(rideId);
          if (!existingRide) {
            socket.emit("ride:accept:response", { success: false, message: "RIDE_NOT_FOUND" });
          } else if (existingRide.status !== "requested") {
            socket.emit("ride:accept:response", { success: false, message: "RIDE_ALREADY_ACCEPTED" });
          } else if (existingRide.driver && String(existingRide.driver) !== String(driverId)) {
            socket.emit("ride:accept:response", { success: false, message: "RIDE_ALREADY_ASSIGNED" });
          } else {
            socket.emit("ride:accept:response", { success: false, message: "RIDE_UNAVAILABLE" });
          }
          return; 
        }

        // Set driver as unavailable when ride is accepted
        await Driver.findByIdAndUpdate(driverId, { isAvailable: false });

        // Auto-join driver to ride chat room
        socket.join(`ride:${ride._id}`);

        // Fetch driver and vehicle details for user
        const driver = await Driver.findById(driverId).select("firstName lastName mobile countryCode rating");
        const vehicle = await Vehicle.findOne({ driver: driverId, status: "active" }).select("type number model color");

        const driverDetails = driver ? {
          _id: driver._id,
          fullName: `${driver.firstName || ''} ${driver.lastName || ''}`.trim(),
          mobile: driver.mobile,
          countryCode: driver.countryCode,
          rating: driver.rating || null
        } : null;

        const vehicleDetails = vehicle ? {
          _id: vehicle._id,
          type: vehicle.type,
          number: vehicle.number,
          model: vehicle.model,
          color: vehicle.color
        } : null;

        const driverRating = await getDriverRatingInfo(driverId);

        const riderSocket = getUserSocketId(ride.rider);
        const payloadToUser = { 
          ride, 
          event: "rideAccepted", 
          otp,
          driver: driverDetails,
          vehicle: vehicleDetails,
          driverRating
        };
        if (riderSocket && ioInstance) ioInstance.to(riderSocket).emit("user:rideAccepted", payloadToUser);
        else ioInstance.to(`user:${ride.rider}`).emit("user:rideAccepted", payloadToUser);

        socket.emit("ride:accept:response", { 
          success: true, 
          ride,
          driver: driverDetails,
          vehicle: vehicleDetails,
          otp,
          driverRating
        });
      } catch (e) { console.error("ride:accept err", e); socket.emit("ride:accept:response", { success:false, message:"SERVER_ERROR" }); }
    });

    socket.on("ride:arrived", async (payload) => {
      try {
        const { rideId, driverId } = payload || {};
        if (!rideId || !driverId) { socket.emit("ride:arrived:response", { success:false, message:"INVALID_PAYLOAD"}); return; }
        const ride = await Ride.findOne({ _id: rideId, driver: driverId });
        if (!ride) { socket.emit("ride:arrived:response", { success:false, message:"INVALID_RIDE" }); return; }
        if (ride.status !== "accepted") { socket.emit("ride:arrived:response", { success:false, message:"RIDE_NOT_IN_ACCEPTED_STATE"}); return; }

        ride.status="arrived";
        ride.actualArrivalTime = new Date(); 
        ride.updatedAt = new Date();
        await ride.save();

        socket.join(`ride:${rideId}`);

        const riderSocket = getUserSocketId(ride.rider);
        const dataForUser = { rideId: ride._id, event: "driverArrived" };
        if (riderSocket && ioInstance) ioInstance.to(riderSocket).emit("user:driverArrived", dataForUser);
        else ioInstance.to(`user:${ride.rider}`).emit("user:driverArrived", dataForUser);

        socket.emit("ride:arrived:response", { success:true, ride });
      } catch (e) { console.error("ride:arrived err", e); socket.emit("ride:arrived:response", { success:false, message:"SERVER_ERROR" }); }
    });

    socket.on("ride:start", async (payload) => {
      try {
        const { rideId, driverId, otp } = payload || {};
        if (!rideId || !driverId) { socket.emit("ride:start:response",{success:false,message:"INVALID_PAYLOAD"}); return; }
        const ride = await Ride.findOne({ _id: rideId, driver: driverId });
        if (!ride) { socket.emit("ride:start:response",{success:false,message:"INVALID_RIDE"}); return; }
        if (ride.status !== "arrived") { socket.emit("ride:start:response",{success:false,message:"RIDE_NOT_READY_TO_START"}); return; }
        if (ride.otpForRideStart && String(ride.otpForRideStart) !== String(otp)) { socket.emit("ride:start:response",{success:false,message:"INVALID_OTP"}); return; }

        ride.otpForRideStart = null; ride.status="ongoing"; ride.startedAt = new Date(); await ride.save();

        const riderSocket = getUserSocketId(ride.rider);
        if (riderSocket && ioInstance) ioInstance.to(riderSocket).emit("user:rideStarted", { ride });
        else ioInstance.to(`user:${ride.rider}`).emit("user:rideStarted", { ride });

        socket.emit("ride:start:response", { success:true, ride });
      } catch (e) { console.error("ride:start err", e); socket.emit("ride:start:response",{success:false,message:"SERVER_ERROR"}); }
    });

    socket.on("ride:reachedDestination", async (payload) => {
      try {
        const { rideId, driverId } = payload || {};
        if (!rideId || !driverId) { 
          socket.emit("ride:reachedDestination:response", { success: false, message: "INVALID_PAYLOAD" }); 
          return; 
        }

        const ride = await Ride.findOne({ _id: rideId, driver: driverId });
        if (!ride) { 
          socket.emit("ride:reachedDestination:response", { success: false, message: "INVALID_RIDE" }); 
          return; 
        }
        
        if (ride.paymentMethod === "wallet") {
          if (!["ongoing", "completed"].includes(ride.status)) {
            socket.emit("ride:reachedDestination:response", { success: false, message: "INVALID_RIDE_STATE", currentStatus: ride.status });
            return;
          }
        } else if (ride.paymentMethod === "cash") {
          if (!["ongoing", "reachedDestination", "completed"].includes(ride.status)) {
            socket.emit("ride:reachedDestination:response", { success: false, message: "INVALID_RIDE_STATE", currentStatus: ride.status });
            return;
          }
        } else {
          socket.emit("ride:reachedDestination:response", { success: false, message: "INVALID_PAYMENT_METHOD" });
          return;
        }
        if (ride.status === "completed") {
          socket.emit("ride:reachedDestination:response", { success: true, ride });
          return;
        }

        const finalFare = resolveRideFare(ride, 0);
        if (finalFare <= 0) {
          socket.emit("ride:reachedDestination:response", { success: false, message: "INVALID_FARE_AMOUNT" });
          return;
        }
        
        if (ride.status === "ongoing") ride.status = "reachedDestination";
        
        // Calculate actual time if ride was started
        if (ride.startedAt) {
          const { calculateActualTime } = require("../helpers/etaCalculator");
          const now = new Date();
          ride.actualTime = calculateActualTime(ride.startedAt, now);
          ride.actualCompletionTime = now;
        }
        
        await ride.save();

        await ensureWallets(ride.rider, driverId);
        if (ride.paymentMethod === "cash") {
          ride.cashPaidByUser = false;
          await ride.save();

          const updatedRide = await Ride.findById(ride._id);
          const riderSocket = getUserSocketId(ride.rider);
          const amountToPay = Number(resolveRideFare(updatedRide, 0).toFixed(2));
          const payload = { ride: updatedRide, amountToPay, currency: "INR" };
          if (riderSocket && ioInstance) ioInstance.to(riderSocket).emit("user:reachedDestination", payload);
          else if (ioInstance) ioInstance.to(`user:${ride.rider}`).emit("user:reachedDestination", payload);

          socket.emit("ride:reachedDestination:response", { success: true, ride: updatedRide });
          return;
        }

        const result = await payByWallet(ride, ride.rider, driverId, finalFare);

        if (!result.success) {
          socket.emit("ride:reachedDestination:response", { success: false, message: result.message });
          return;
        }

        const updatedRide = await Ride.findById(ride._id);
        const riderSocket = getUserSocketId(ride.rider);
        const driverSocket = getDriverSocketId(driverId);
        
        if (riderSocket && ioInstance) {
          ioInstance.to(riderSocket).emit("user:rideCompleted", { ride: updatedRide });
        } else if (ioInstance) {
          ioInstance.to(`user:${ride.rider}`).emit("user:rideCompleted", { ride: updatedRide });
        }

        if (driverSocket && ioInstance) {
          ioInstance.to(driverSocket).emit("driver:rideCompleted", { ride: updatedRide });
        } else if (ioInstance) {
          ioInstance.to(`driver:${driverId}`).emit("driver:rideCompleted", { ride: updatedRide });
        }

        socket.emit("ride:reachedDestination:response", { success: true, ride: updatedRide });
      } catch (e) { 
        console.error("ride:reachedDestination err", e); 
        socket.emit("ride:reachedDestination:response", { success: false, message: "SERVER_ERROR" }); 
      }
    });

    socket.on("user:paymentDue", async (payload) => {
      try {
        const { rideId, userId } = payload || {};
        if (!rideId || !userId) {
          socket.emit("user:paymentDue:response", { success: false, message: "INVALID_PAYLOAD" });
          return;
        }
        const ride = await Ride.findOne({ _id: rideId, rider: userId });
        if (!ride) {
          socket.emit("user:paymentDue:response", { success: false, message: "INVALID_RIDE" });
          return;
        }
        if (ride.paymentMethod !== "cash" || ride.status !== "reachedDestination") {
          socket.emit("user:paymentDue:response", { success: false, message: "INVALID_RIDE_STATE" });
          return;
        }
        const amountToPay = Number(resolveRideFare(ride, 0).toFixed(2));
        socket.emit("user:paymentDue:response", { success: true, rideId: ride._id, amountToPay, currency: "INR" });
      } catch (e) {
        console.error("user:paymentDue err", e);
        socket.emit("user:paymentDue:response", { success: false, message: "SERVER_ERROR" });
      }
    });

    socket.on("driver:receivedPayment", async (payload) => {
      try {
        const { rideId, driverId } = payload || {};
        if (!rideId || !driverId) {
          socket.emit("driver:receivedPayment:response", { success: false, message: "INVALID_PAYLOAD" });
          return;
        }

        const ride = await Ride.findOne({
          _id: rideId,
          driver: driverId,
          status: "reachedDestination",
          paymentMethod: "cash",
          paidToDriver: { $ne: true }
        });

        if (!ride) {
          const checkRide = await Ride.findById(rideId);
          if (!checkRide) {
            socket.emit("driver:receivedPayment:response", { success: false, message: "INVALID_RIDE" });
            return;
          }
          if (String(checkRide.driver) !== String(driverId)) {
            socket.emit("driver:receivedPayment:response", { success: false, message: "RIDE_NOT_ASSIGNED_TO_DRIVER" });
            return;
          }
          if (checkRide.status !== "reachedDestination" || checkRide.paymentMethod !== "cash") {
            socket.emit("driver:receivedPayment:response", { success: false, message: "INVALID_RIDE_STATE", status: checkRide.status, paymentMethod: checkRide.paymentMethod });
            return;
          }
          if (checkRide.paidToDriver) {
            socket.emit("driver:receivedPayment:response", { success: false, message: "PAYMENT_ALREADY_CONFIRMED" });
            return;
          }
          socket.emit("driver:receivedPayment:response", { success: false, message: "INVALID_RIDE_STATE" });
          return;
        }

        const finalFare = resolveRideFare(ride, 0);
        if (finalFare <= 0) {
          socket.emit("driver:receivedPayment:response", { success: false, message: "INVALID_FARE_AMOUNT", finalFare: finalFare, estimatedFare: ride.estimatedFare });
          return;
        }
        
        const result = await confirmCashPayment(ride, ride.rider, driverId, finalFare);

        if (!result.success) {
          socket.emit("driver:receivedPayment:response", { success: false, message: result.message });
          return;
        }

        const updatedRide = await Ride.findById(ride._id);
        const riderSocket = getUserSocketId(ride.rider);
        
        if (riderSocket && ioInstance) {
          ioInstance.to(riderSocket).emit("user:rideCompleted", { ride: updatedRide });
        } else if (ioInstance) {
          ioInstance.to(`user:${ride.rider}`).emit("user:rideCompleted", { ride: updatedRide });
        }

        socket.emit("driver:receivedPayment:response", { success: true, ride: updatedRide });
      } catch (e) { 
        console.error("driver:receivedPayment err", e);
        socket.emit("driver:receivedPayment:response", { success: false, message: "SERVER_ERROR" });
      }
    });

    socket.on("ride:cancel:user", async (payload) => {
      try {
        const { rideId, userId, reason } = payload || {};
        if (!rideId || !userId) { 
          socket.emit("ride:cancel:response", { success: false, message: "INVALID_PAYLOAD" }); 
          return; 
        }

        const ride = await Ride.findOne({ _id: rideId, rider: userId });
        if (!ride) { 
          socket.emit("ride:cancel:response", { success: false, message: "INVALID_RIDE" }); 
          return; 
        }

        if (ride.status === "completed" || ride.status === "cancelled") {
          socket.emit("ride:cancel:response", { success: false, message: "RIDE_CANNOT_BE_CANCELLED" }); 
          return;
        }

        if (ride.status === "ongoing" || ride.status === "reachedDestination") {
          socket.emit("ride:cancel:response", { success: false, message: "CANNOT_CANCEL_RIDE_IN_PROGRESS" });
          return;
        }

        // Calculate and apply cancellation penalty if ride was accepted or driver arrived
        const wasAccepted = (ride.status === "accepted" || ride.status === "arrived") && ride.driver;
        if (wasAccepted) {
          try {
            const settings = await AdminSetting.findOne({});
            const cancellationPercentage = settings?.userCancellationPercentage || 10;
            const rideFare = resolveRideFare(ride, 0);
            
            if (rideFare > 0 && cancellationPercentage > 0) {
              const penaltyAmount = Number(((rideFare * cancellationPercentage) / 100).toFixed(2));
              
              if (penaltyAmount > 0) {
                const user = await User.findById(userId);
                if (user) {
                  const currentPenalty = Number((user.cancellationPenalty || 0).toFixed(2));
                  user.cancellationPenalty = Number((currentPenalty + penaltyAmount).toFixed(2));
                  await user.save();
                }
              }
            }
          } catch (error) {
            console.error("Error calculating cancellation penalty:", error);
          }
        }

        ride.status = "cancelled";
        ride.cancellationReason = reason || "Cancelled by user";
        ride.cancelledBy = "user";
        ride.cancelledAt = new Date();
        await ride.save();

        // Set driver as available when ride is cancelled
        if (ride.driver) {
          await Driver.findByIdAndUpdate(ride.driver, { isAvailable: true });
          const driverSocket = getDriverSocketId(ride.driver);
          if (driverSocket && ioInstance) {
            ioInstance.to(driverSocket).emit("driver:rideCancelled", { ride, cancelledBy: "user" });
          }
        }

        const riderSocket = getUserSocketId(ride.rider);
        if (riderSocket && ioInstance) {
          ioInstance.to(riderSocket).emit("user:rideCancelled", { ride, cancelledBy: "user", message: reason || "Ride cancelled by user" });
        } else if (ioInstance) {
          ioInstance.to(`user:${ride.rider}`).emit("user:rideCancelled", { ride, cancelledBy: "user", message: reason || "Ride cancelled by user" });
        }

        socket.emit("ride:cancel:response", { success: true, ride });
      } catch (e) { 
        console.error("ride:cancel:user err", e); 
        socket.emit("ride:cancel:response", { success: false, message: "SERVER_ERROR" }); 
      }
    });

    socket.on("ride:cancel:driver", async (payload) => {
      try {
        const { rideId, driverId, reason } = payload || {};
        if (!rideId || !driverId) { 
          socket.emit("ride:cancel:response", { success: false, message: "INVALID_PAYLOAD" }); 
          return; 
        }

        const ride = await Ride.findOne({ _id: rideId, driver: driverId });
        if (!ride) { 
          socket.emit("ride:cancel:response", { success: false, message: "INVALID_RIDE" }); 
          return; 
        }

        if (ride.status === "completed" || ride.status === "cancelled") {
          socket.emit("ride:cancel:response", { success: false, message: "RIDE_CANNOT_BE_CANCELLED" }); 
          return;
        }

        if (ride.status === "ongoing" || ride.status === "reachedDestination") {
          socket.emit("ride:cancel:response", { success: false, message: "CANNOT_CANCEL_RIDE_IN_PROGRESS" }); 
          return;
        }

        ride.cancelledDrivers.push(driverId);
        ride.driver = null;
        ride.status = "requested";
        ride.otpForRideStart = null;
        await ride.save();

        // Set driver as available when ride is cancelled by driver
        await Driver.findByIdAndUpdate(driverId, { isAvailable: true });

        // Normalize vehicle type for matching (ride uses "prime sedan", vehicle uses "prime-sedan")
        const normalizedVehicleType = ride.vehicleType === "prime sedan" ? "prime-sedan" : ride.vehicleType;
        
        // Find drivers with matching vehicle type
        const vehiclesWithMatchingType = await Vehicle.find({
          type: normalizedVehicleType,
          status: "active"
        }).select("driver").lean();
        
        const driverIdsWithMatchingVehicle = vehiclesWithMatchingType.map(v => v.driver);
        
        const [pickupLng, pickupLat] = ride.pickupLocation.coordinates;
        // Filter out cancelled drivers from matching vehicle drivers
        const availableDriverIds = driverIdsWithMatchingVehicle.filter(
          id => !ride.cancelledDrivers.some(cancelledId => String(cancelledId) === String(id))
        );
        
        if (availableDriverIds.length === 0) {
          const riderSocket = getUserSocketId(ride.rider);
          if (riderSocket && ioInstance) {
            ioInstance.to(riderSocket).emit("user:searchingDriver", { ride, message: "Your driver cancelled. Finding new driver..." });
          } else {
            ioInstance.to(`user:${ride.rider}`).emit("user:searchingDriver", { ride, message: "Your driver cancelled. Finding new driver..." });
          }
          socket.emit("ride:cancel:response", { success: true, ride, newDriverAssigned: false });
          return;
        }
        
        const nearbyDrivers = await Driver.find({
          _id: { $in: availableDriverIds },
          isAvailable: true,
          registrationStatus: "approved",
          status: "active",
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [pickupLng, pickupLat]
              },
              $maxDistance: 5000
            }
          }
        }).select("_id").limit(10);

        if (nearbyDrivers.length > 0) {
          nearbyDrivers.forEach(driver => {
            sendRideToDriver(driver._id.toString(), ride);
          });

          const riderSocket = getUserSocketId(ride.rider);
          if (riderSocket && ioInstance) {
            ioInstance.to(riderSocket).emit("user:searchingDriver", { ride, message: "Your driver cancelled. Finding new driver..." });
          } else {
            ioInstance.to(`user:${ride.rider}`).emit("user:searchingDriver", { ride, message: "Your driver cancelled. Finding new driver..." });
          }

          socket.emit("ride:cancel:response", { success: true, ride, newDriverAssigned: false });
        } else {
          const riderSocket = getUserSocketId(ride.rider);
          if (riderSocket && ioInstance) {
            ioInstance.to(riderSocket).emit("user:searchingDriver", { ride, message: "Your driver cancelled. Finding new driver..." });
          } else {
            ioInstance.to(`user:${ride.rider}`).emit("user:searchingDriver", { ride, message: "Your driver cancelled. Finding new driver..." });
          }

          socket.emit("ride:cancel:response", { success: true, ride, newDriverAssigned: false });
        }
      } catch (e) { 
        console.error("ride:cancel:driver err", e); 
        socket.emit("ride:cancel:response", { success: false, message: "SERVER_ERROR" }); 
      }
    });

    socket.on("disconnect", () => {
      try {
        removeDriverSocketBySocketId(socket.id);
        removeUserSocketBySocketId(socket.id);
        console.log("🔴 Socket disconnected:", socket.id);
      } catch (e) { console.error("disconnect err", e); }
    });
  });
}

function sendRideToDriver(driverId, rideData) {
  if (!ioInstance) { console.log("❌ ioInstance not initialized"); return false; }
  try {
    const socketId = getDriverSocketId(driverId);
    if (!socketId) { 
      console.log(`⚠️ Driver ${driverId} offline - not in socket map`); 
      return false; 
    }
    console.log(`🚕 Sending ride to driver ${driverId} via socket ${socketId}`);
    // Emit only to socketId to avoid duplicate messages (driver is also in the room)
    ioInstance.to(socketId).emit("ride:new", rideData);
    return true;
  } catch (e) { console.error("sendRideToDriver err", e); return false; }
}

function sendToUser(userId, eventName, data) {
  if (!ioInstance) return false;
  try {
    const socketId = getUserSocketId(userId);
    if (socketId) {
      ioInstance.to(socketId).emit(eventName, data);
      return true;
    } else {
      ioInstance.to(`user:${userId}`).emit(eventName, data);
      return true;
    }
  } catch (e) { console.error("sendToUser err", e); return false; }
}

module.exports = { initSocketIO, sendRideToDriver, sendToUser, _getIo: () => ioInstance };
