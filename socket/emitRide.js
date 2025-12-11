const Ride = require("../models/ride.model");
const Driver = require("../models/driver.model");
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

        console.log("Creating wallets...");
        await ensureWallets(ride.rider, driverId);
        console.log("Wallets ensured");

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

        ride.status = "completed";
        ride.completedAt = new Date();
        ride.finalFare = finalFare;
        await ride.save();

        console.log("=== RIDE COMPLETED SUCCESSFULLY VIA SOCKET ===");

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

        ride.status = "cancelled";
        ride.cancellationReason = reason || "Cancelled by user";
        ride.cancelledBy = "user";
        ride.cancelledAt = new Date();
        await ride.save();

        if (ride.driver) {
          const driverSocket = getDriverSocketId(ride.driver);
          if (driverSocket && ioInstance) {
            ioInstance.to(driverSocket).emit("driver:rideCancelled", { ride, cancelledBy: "user" });
          }
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

        if (ride.status === "ongoing") {
          socket.emit("ride:cancel:response", { success: false, message: "CANNOT_CANCEL_ONGOING_RIDE" }); 
          return;
        }

        ride.cancelledDrivers.push(driverId);
        ride.driver = null;
        ride.status = "requested";
        ride.otpForRideStart = null;
        await ride.save();

        const newDriver = await Driver.findOne({
          _id: { $nin: ride.cancelledDrivers },
          isAvailable: true,
          registrationStatus: "approved",
          status: "active"
        }).select("_id");

        if (newDriver) {
          ride.driver = newDriver._id;
          await ride.save();

          const newDriverSocket = getDriverSocketId(newDriver._id);
          if (newDriverSocket && ioInstance) {
            ioInstance.to(newDriverSocket).emit("ride:new", ride);
          }

          const riderSocket = getUserSocketId(ride.rider);
          if (riderSocket && ioInstance) {
            ioInstance.to(riderSocket).emit("user:driverChanged", { ride, message: "Your driver cancelled. New driver assigned!" });
          } else {
            ioInstance.to(`user:${ride.rider}`).emit("user:driverChanged", { ride, message: "Your driver cancelled. New driver assigned!" });
          }

          socket.emit("ride:cancel:response", { success: true, ride, newDriverAssigned: true });
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
