// socket/driverSocketMap.js
const driverSocketMap = new Map();
const userSocketMap = new Map();
const driverLocationMap = new Map();

module.exports = {
  addDriverSocket(driverId, socketId) {
    if (!driverId) return;
    driverSocketMap.set(String(driverId), socketId);
    console.log("driverSocketMap add:", driverId, socketId);
  },

  removeDriverSocketBySocketId(socketId) {
    for (const [driverId, sId] of driverSocketMap.entries()) {
      if (sId === socketId) {
        driverSocketMap.delete(driverId);
        driverLocationMap.delete(driverId);
        console.log("driverSocketMap removed:", driverId);
        break;
      }
    }
  },

  getDriverSocketId(driverId) {
    return driverSocketMap.get(String(driverId)) || null;
  },

  updateDriverLocation(driverId, lat, lng) {
    if (!driverId) return;
    driverLocationMap.set(String(driverId), { lat: Number(lat), lng: Number(lng), updatedAt: new Date() });
  },

  getDriverLocation(driverId) {
    return driverLocationMap.get(String(driverId)) || null;
  },

  addUserSocket(userId, socketId) {
    if (!userId) return;
    userSocketMap.set(String(userId), socketId);
    console.log("userSocketMap add:", userId, socketId);
  },

  removeUserSocketBySocketId(socketId) {
    for (const [userId, sId] of userSocketMap.entries()) {
      if (sId === socketId) {
        userSocketMap.delete(userId);
        console.log("userSocketMap removed:", userId);
        break;
      }
    }
  },

  getUserSocketId(userId) {
    return userSocketMap.get(String(userId)) || null;
  },

  removeUserSocketByUserId(userId) {
    userSocketMap.delete(String(userId));
  },

  _debugAll() {
    return {
      drivers: Array.from(driverSocketMap.entries()),
      users: Array.from(userSocketMap.entries()),
      locations: Array.from(driverLocationMap.entries())
    };
  }
};
