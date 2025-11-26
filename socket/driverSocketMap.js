const driverSocketMap = new Map();
const userSocketMap = new Map();
const driverLocationMap = new Map();

module.exports = {
  // Driver socket registration
  addDriverSocket(driverId, socketId) {
    if (!driverId) return;
    driverSocketMap.set(String(driverId), socketId);
  },

  // Remove driver by socket ID
  removeDriverSocketBySocketId(socketId) {
    for (const [driverId, sId] of driverSocketMap.entries()) {
      if (sId === socketId) {
        driverSocketMap.delete(driverId);
        driverLocationMap.delete(driverId);
        break;
      }
    }
  },

  // Get socket ID for driver
  getDriverSocketId(driverId) {
    return driverSocketMap.get(String(driverId));
  },

  // Update driver location
  updateDriverLocation(driverId, lat, lng) {
    if (!driverId) return;
    driverLocationMap.set(String(driverId), {
      lat: Number(lat),
      lng: Number(lng),
      updatedAt: new Date()
    });
  },

  getDriverLocation(driverId) {
    return driverLocationMap.get(String(driverId)) || null;
  },

  // USER socket map
  addUserSocket(userId, socketId) {
    if (!userId) return;
    userSocketMap.set(String(userId), socketId);
  },

  removeUserSocketBySocketId(socketId) {
    for (const [userId, sId] of userSocketMap.entries()) {
      if (sId === socketId) {
        userSocketMap.delete(userId);
        break;
      }
    }
  },

  removeUserSocketByUserId(userId) {
    userSocketMap.delete(String(userId));
  },

  getUserSocketId(userId) {
    return userSocketMap.get(String(userId));
  },

  _debugAll() {
    return {
      drivers: Array.from(driverSocketMap.entries()),
      users: Array.from(userSocketMap.entries()),
      locations: Array.from(driverLocationMap.entries())
    };
  }
};
