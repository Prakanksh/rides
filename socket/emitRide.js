const Ride = require("../models/ride.model");
const Driver = require("../models/driver.model");
const Vehicle = require("../models/vehicle.model");
const { ensureWallets, payByWallet, payByCash, confirmCashPayment } = require("../helpers/walletUtil");
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
    socket.on("driver:online", (driverId) => {
      try {
        addDriverSocket(driverId, socket.id);
        socket.join(`driver:${driverId}`);
        socket.emit("driver:online:ack", { ok: true });
      } catch (e) { console.error("driver:online err", e); }
    });

    socket.on("user:connect", (userId) => {
      try {
        addUserSocket(userId, socket.id);
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
        
        if (ride.status !== "ongoing") { 
          socket.emit("ride:reachedDestination:response", { success: false, message: "RIDE_NOT_STARTED" }); 
          return; 
        }

        const finalFare = ride.finalFare > 0 ? ride.finalFare : (ride.estimatedFare || 0);
        if (finalFare <= 0) {
          socket.emit("ride:reachedDestination:response", { success: false, message: "INVALID_FARE_AMOUNT" });
          return;
        }
        
        ride.status = "reachedDestination";
        await ride.save();

        await ensureWallets(ride.rider, driverId);
        const result = ride.paymentMethod === "wallet" 
          ? await payByWallet(ride, ride.rider, driverId, finalFare)
          : await payByCash(ride, ride.rider, driverId, finalFare);
          
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

    socket.on("user:paidPayment", async (payload) => {
      try {
        const { rideId, userId } = payload || {};
        if (!rideId || !userId) {
          socket.emit("user:paidPayment:response", { success: false, message: "INVALID_PAYLOAD" });
          return;
        }

        const ride = await Ride.findOne({ _id: rideId, rider: userId });
        if (!ride) {
          socket.emit("user:paidPayment:response", { success: false, message: "INVALID_RIDE" });
          return;
        }

        if (ride.status !== "reachedDestination" || ride.paymentMethod !== "cash") {
          socket.emit("user:paidPayment:response", { success: false, message: "INVALID_RIDE_STATE" });
          return;
        }

        if (ride.driver) {
          const finalFare = ride.finalFare || ride.estimatedFare || 0;
          const driverSocket = getDriverSocketId(ride.driver);
          if (driverSocket && ioInstance) {
            ioInstance.to(driverSocket).emit("driver:paymentReceived", { 
              rideId: ride._id, 
              userId: userId,
              finalFare: finalFare,
              ride: ride
            });
          } else if (ioInstance) {
            ioInstance.to(`driver:${ride.driver}`).emit("driver:paymentReceived", { 
              rideId: ride._id, 
              userId: userId,
              finalFare: finalFare,
              ride: ride
            });
          }
        }

        socket.emit("user:paidPayment:response", { success: true, message: "PAYMENT_NOTIFICATION_SENT" });
      } catch (e) {
        console.error("user:paidPayment err", e);
        socket.emit("user:paidPayment:response", { success: false, message: "SERVER_ERROR" });
      }
    });

    socket.on("driver:receivedPayment", async (payload) => {
      try {
        const { rideId, driverId } = payload || {};
        if (!rideId || !driverId) {
          socket.emit("driver:receivedPayment:response", { success: false, message: "INVALID_PAYLOAD" });
          return;
        }

        const ride = await Ride.findById(rideId);
        if (!ride) {
          socket.emit("driver:receivedPayment:response", { success: false, message: "INVALID_RIDE" });
          return;
        }

        if (String(ride.driver) !== String(driverId)) {
          socket.emit("driver:receivedPayment:response", { success: false, message: "RIDE_NOT_ASSIGNED_TO_DRIVER" });
          return;
        }

        if (ride.status !== "reachedDestination" || ride.paymentMethod !== "cash") {
          socket.emit("driver:receivedPayment:response", { success: false, message: "INVALID_RIDE_STATE", status: ride.status, paymentMethod: ride.paymentMethod });
          return;
        }

        if (ride.paidToDriver) {
          socket.emit("driver:receivedPayment:response", { success: false, message: "PAYMENT_ALREADY_CONFIRMED" });
          return;
        }

        const finalFare = ride.finalFare > 0 ? ride.finalFare : (ride.estimatedFare || 0);
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
        
        const newDriver = await Driver.findOne({
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
