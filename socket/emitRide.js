const Ride = require("../models/ride.model");
let ioInstance = null;

const {
  addDriverSocket,
  removeDriverSocketBySocketId,
  getDriverSocketId,
  addUserSocket,
  removeUserSocketBySocketId,
  removeUserSocketByUserId,
  getUserSocketId,
  updateDriverLocation
} = require("./driverSocketMap");

function initSocketIO(io) {
  ioInstance = io;

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    // DRIVER ONLINE
    socket.on("driver:online", (driverId) => {
      addDriverSocket(String(driverId), socket.id);
      console.log("🟢 Driver", driverId, "online");
      socket.join(`driver:${driverId}`);
      socket.emit("driver:online:ack", { ok: true });
    });

    // USER CONNECT
    socket.on("user:connect", (userId) => {
      removeUserSocketByUserId(String(userId));
      addUserSocket(String(userId), socket.id);
      console.log("🟣 User", userId, "connected");
      socket.join(`user:${userId}`);
      socket.emit("user:connect:ack", { ok: true });
    });

    // DRIVER LOCATION
    socket.on("driver:location", async (data) => {
      const { driverId, lat, lng } = data || {};
      if (!driverId) return;

      updateDriverLocation(String(driverId), lat, lng);

      const activeRide = await Ride.findOne({
        driver: driverId,
        status: { $in: ["accepted", "arrived", "ongoing"] }
      }).select("rider _id");

      if (activeRide) {
        const riderSocketId = getUserSocketId(String(activeRide.rider));
        const payload = { rideId: activeRide._id, lat, lng };

        if (riderSocketId) {
          ioInstance.to(riderSocketId).emit("driver:location", payload);
        } else {
          ioInstance.to(`user:${activeRide.rider}`).emit("driver:location", payload);
        }
      }
    });

    // DRIVER ACCEPT RIDE
    socket.on("ride:accept", async ({ rideId, driverId }) => {
      const ride = await Ride.findById(rideId);
      if (!ride) return;

      ride.driver = driverId;
      ride.status = "accepted";
      await ride.save();

      const riderSocketId = getUserSocketId(String(ride.rider));
      if (riderSocketId) {
        ioInstance.to(riderSocketId).emit("user:rideAccepted", { ride });
      }

      socket.emit("ride:accept:response", { success: true, ride });
    });

    // DRIVER ARRIVED + OTP
    socket.on("ride:arrived", async ({ rideId, driverId }) => {
      const ride = await Ride.findOne({ _id: rideId, driver: driverId });

      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      ride.status = "arrived";
      ride.otpForRideStart = otp;
      await ride.save();

      const riderSocketId = getUserSocketId(String(ride.rider));
      if (riderSocketId) {
        ioInstance.to(riderSocketId).emit("user:driverArrived", {
          rideId,
          otp
        });
      }

      socket.emit("ride:arrived:response", { success: true, ride });
    });

    // DRIVER START RIDE
    socket.on("ride:start", async ({ rideId, driverId, otp }) => {
      const ride = await Ride.findOne({ _id: rideId, driver: driverId });

      if (ride.otpForRideStart && otp != ride.otpForRideStart) {
        return socket.emit("ride:start:response", { success: false, message: "INVALID_OTP" });
      }

      ride.status = "ongoing";
      ride.otpForRideStart = null;
      await ride.save();

      const riderSocketId = getUserSocketId(String(ride.rider));
      if (riderSocketId) {
        ioInstance.to(riderSocketId).emit("user:rideStarted", { ride });
      }

      socket.emit("ride:start:response", { success: true, ride });
    });

    // DRIVER COMPLETE
    socket.on("ride:complete", async ({ rideId, driverId }) => {
      const ride = await Ride.findOne({ _id: rideId, driver: driverId });

      ride.status = "completed";
      await ride.save();

      const riderSocketId = getUserSocketId(String(ride.rider));
      if (riderSocketId) {
        ioInstance.to(riderSocketId).emit("user:rideCompleted", { ride });
      }

      socket.emit("ride:complete:response", { success: true, ride });
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      removeDriverSocketBySocketId(socket.id);
      removeUserSocketBySocketId(socket.id);
      console.log("🔴 Driver/User disconnected", socket.id);
    });
  });
}

// SEND RIDE VIA REST API
function sendRideToDriver(driverId, rideData) {
  const socketId = getDriverSocketId(String(driverId));
  if (!socketId) return;

  ioInstance.to(socketId).emit("ride:new", rideData);
}

module.exports = {
  initSocketIO,
  sendRideToDriver
};
