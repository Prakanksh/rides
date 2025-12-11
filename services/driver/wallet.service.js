// services/driver/wallet.service.js
const Driver = require("../../models/driver.model");
const Transaction = require("../../models/transactions.model");
const { responseData } = require("../../helpers/responseData");

module.exports = {
  getWallet: async (req, res) => {
    try {
      const driverId = req.user && req.user._id;
      if (!driverId) return res.json(responseData("NOT_AUTHORIZED", {}, req, false));

      const driver = await Driver.findById(driverId).lean();
      const transactions = await Transaction.find({
        $or: [
          { paidById: driverId, paidBy: "driver" },
          { paidToId: driverId, paidTo: "driver" },
          { driverId: driverId }
        ]
      }).sort({ createdAt: -1 }).lean();

      if (!driver) {
        return res.json(responseData("DRIVER_NOT_FOUND", { wallet: { mainBalance: 0, commissionBalance: 0 }, transactions: [] }, req, true));
      }

      const walletInfo = {
        mainBalance: driver.wallet || 0,
        commissionBalance: driver.driverCommission || 0
      };

      return res.json(responseData("WALLET_FETCHED", { wallet: walletInfo, transactions }, req, true));
    } catch (err) {
      console.error("getWallet err", err);
      return res.json(responseData("SERVER_ERROR", {}, req, false));
    }
  }
};
