const driverSocketMap = new Map();

module.exports = {
  addDriverSocket(driverId, socketId) {
    driverSocketMap.set(driverId, socketId);
  },

  removeDriverSocket(socketId) {
    for (const [driverId, sId] of driverSocketMap.entries()) {
      if (sId === socketId) {
        driverSocketMap.delete(driverId);
      }
    }
  },

  getSocketId(driverId) {
    return driverSocketMap.get(driverId);
  },

  getDriverSocket(driverId) {
    return driverSocketMap.get(driverId);
  }
};
