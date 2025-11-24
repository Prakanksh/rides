function sendRideToDriver(driverId, rideData) {
  if (!global.io) return;

  const socketId = getSocketIdByDriver(driverId);

  if (!socketId) {
    console.log("❌ Driver not connected:", driverId);
    return;
  }

  console.log("🚕 Sending ride request to driver:", driverId);

  global.io.to(socketId).emit("ride:incoming", rideData);
}

module.exports = {
  initSocketIO,
  sendRideToDriver
};
