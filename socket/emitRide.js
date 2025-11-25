let ioInstance = null;
const { getDriverSocket } = require("./driverSocketMap");

// ⭐ 1) Initialize IO instance once
function initSocketIO(io) {
  ioInstance = io;
}

// ⭐ 2) Send ride to driver
function sendRideToDriver(driverId, rideData) {
  if (!ioInstance) {
    console.log("❌ ERROR: ioInstance not initialized!");
    return;
  }

  const driverSocket = getDriverSocket(driverId);

  if (!driverSocket) {
    console.log(`⚠️ Driver ${driverId} is offline. Cannot send ride.`);
    return;
  }

  console.log(`🚕 Sending ride to driver ${driverId} on socket ${driverSocket}`);

  ioInstance.to(driverSocket).emit("ride:new", rideData);
}

module.exports = {
  initSocketIO,
  sendRideToDriver
};
