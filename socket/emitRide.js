// socket/emitRide.js
const Ride = require("../models/ride.model");
const { ensureWallets, payByWallet, payByCash } = require("../helpers/walletUtil");
let ioInstance = null;

const {
  addDriverSocket,
  removeDriverSocketBySocketId,
  getDriverSocketId,
  addUserSocket,
  removeUserSocketBySocketId,
  getUserSocketId,
  updateDriverLocation
} = require("./driverSocketMap");

// Initialize IO and handlers
function initSocketIO(io) {
  ioInstance = io;

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    socket.on("driver:online", (driverId) => {
      try {
        addDriverSocket(driverId, socket.id);
        console.log("🟢 Driver", driverId, "online ->", socket.id);
        socket.join(`driver:${driverId}`);
        socket.emit("driver:online:ack", { ok: true });
      } catch (e) { console.error("driver:online err", e); }
    });

    socket.on("user:connect", (userId) => {
      try {
        addUserSocket(userId, socket.id);
        console.log("🟣 User", userId, "connected ->", socket.id);
        socket.join(`user:${userId}`);
        socket.emit("user:connect:ack", { ok: true });
      } catch (e) { console.error("user:connect err", e); }
    });

    socket.on("driver:location", async (data) => {
      try {
        const { driverId, lat, lng } = data || {};
        if (!driverId || lat == null || lng == null) return;
        updateDriverLocation(driverId, lat, lng);
        // forward to user's room if driver has active ride
        const activeRide = await Ride.findOne({
          driver: driverId,
          status: { $in: ["accepted", "arrived", "ongoing"] }
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

    // driver accepts via socket
    socket.on("ride:accept", async (payload) => {
      try {
        const { rideId, driverId } = payload || {};
        if (!rideId || !driverId) {
          socket.emit("ride:accept:response", { success: false, message: "INVALID_PAYLOAD" });
          return;
        }
        const ride = await Ride.findById(rideId);
        if (!ride) { socket.emit("ride:accept:response", { success: false, message: "RIDE_NOT_FOUND" }); return; }
        if (ride.status !== "requested" && String(ride.driver) !== String(driverId)) {
          socket.emit("ride:accept:response", { success: false, message: "RIDE_UNAVAILABLE" }); return;
        }
        ride.driver = driverId;
        ride.status = "accepted";
        ride.updatedAt = new Date();
        await ride.save();

        const riderSocket = getUserSocketId(ride.rider);
        const payloadToUser = { ride, event: "rideAccepted" };
        if (riderSocket && ioInstance) ioInstance.to(riderSocket).emit("user:rideAccepted", payloadToUser);
        else ioInstance.to(`user:${ride.rider}`).emit("user:rideAccepted", payloadToUser);

        socket.emit("ride:accept:response", { success: true, ride });
      } catch (e) { console.error("ride:accept err", e); socket.emit("ride:accept:response", { success:false, message:"SERVER_ERROR" }); }
    });

    // arrived
    socket.on("ride:arrived", async (payload) => {
      try {
        const { rideId, driverId } = payload || {};
        if (!rideId || !driverId) { socket.emit("ride:arrived:response", { success:false, message:"INVALID_PAYLOAD"}); return; }
        const ride = await Ride.findOne({ _id: rideId, driver: driverId });
        if (!ride) { socket.emit("ride:arrived:response", { success:false, message:"INVALID_RIDE" }); return; }
        if (ride.status !== "accepted") { socket.emit("ride:arrived:response", { success:false, message:"RIDE_NOT_IN_ACCEPTED_STATE"}); return; }

        const otp = String(Math.floor(1000 + Math.random() * 9000));
        ride.status="arrived"; ride.otpForRideStart = otp; ride.updatedAt = new Date(); await ride.save();

        const riderSocket = getUserSocketId(ride.rider);
        const dataForUser = { rideId: ride._id, event: "driverArrived", otp };
        if (riderSocket && ioInstance) ioInstance.to(riderSocket).emit("user:driverArrived", dataForUser);
        else ioInstance.to(`user:${ride.rider}`).emit("user:driverArrived", dataForUser);

        socket.emit("ride:arrived:response", { success:true, ride });
      } catch (e) { console.error("ride:arrived err", e); socket.emit("ride:arrived:response", { success:false, message:"SERVER_ERROR" }); }
    });

    // start
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

    // complete
    socket.on("ride:complete", async (payload) => {
      try {
        console.log("=== SOCKET RIDE:COMPLETE ===");
        const { rideId, driverId } = payload || {};
        console.log("rideId:", rideId, "driverId:", driverId);
        
        if (!rideId || !driverId) { 
          socket.emit("ride:complete:response", { success: false, message: "INVALID_PAYLOAD" }); 
          return; 
        }

        const ride = await Ride.findOne({ _id: rideId, driver: driverId });
        console.log("Ride found:", ride ? "YES" : "NO");
        
        if (!ride) { 
          socket.emit("ride:complete:response", { success: false, message: "INVALID_RIDE" }); 
          return; 
        }
        
        if (ride.status !== "ongoing") { 
          console.log("Ride status is:", ride.status, "- expected 'ongoing'");
          socket.emit("ride:complete:response", { success: false, message: "RIDE_NOT_STARTED" }); 
          return; 
        }

        const finalFare = ride.finalFare || ride.estimatedFare;
        console.log("Final fare:", finalFare);
        console.log("Payment method:", ride.paymentMethod);

        // Ensure wallets exist
        console.log("Creating wallets...");
        await ensureWallets(ride.rider, driverId);
        console.log("Wallets ensured");

        // Process payment
        let result;
        if (ride.paymentMethod === "wallet") {
          console.log("Processing wallet payment...");
          result = await payByWallet(ride, ride.rider, driverId, finalFare);
        } else {
          console.log("Processing cash payment...");
          result = await payByCash(ride, ride.rider, driverId, finalFare);
        }

        console.log("Payment result:", result);

        if (!result.success) {
          socket.emit("ride:complete:response", { success: false, message: result.message });
          return;
        }

        // Update ride status
        ride.status = "completed";
        ride.completedAt = new Date();
        ride.finalFare = finalFare;
        await ride.save();

        console.log("=== RIDE COMPLETED SUCCESSFULLY VIA SOCKET ===");

        // Notify user
        const riderSocket = getUserSocketId(ride.rider);
        if (riderSocket && ioInstance) {
          ioInstance.to(riderSocket).emit("user:rideCompleted", { ride });
        } else {
          ioInstance.to(`user:${ride.rider}`).emit("user:rideCompleted", { ride });
        }

        socket.emit("ride:complete:response", { success: true, ride });
      } catch (e) { 
        console.error("=== SOCKET RIDE:COMPLETE ERROR ===", e); 
        socket.emit("ride:complete:response", { success: false, message: "SERVER_ERROR" }); 
      }
    });

    // cleanup
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
    if (!socketId) { console.log(`⚠️ Driver ${driverId} offline`); return false; }
    console.log(`🚕 Sending ride to driver ${driverId} via ${socketId}`);
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
