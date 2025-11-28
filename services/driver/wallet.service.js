// services/driver/wallet.service.js
const DriverWallet = require("../../models/driverWallet.model");
const WalletTransaction = require("../../models/walletTransaction.model");
const { responseData } = require("../../helpers/responseData");

module.exports = {
  getWallet: async (req, res) => {
    try {
      const driverId = req.user && req.user._id;
      if (!driverId) return res.json(responseData("NOT_AUTHORIZED", {}, req, false));

      const wallet = await DriverWallet.findOne({ driverId }).lean();
      const transactions = await WalletTransaction.find({ driverId }).sort({ createdAt: -1 }).lean();

      if (!wallet) {
        return res.json(responseData("WALLET_NOT_FOUND", { wallet: { mainBalance: 0, commissionBalance: 0 }, transactions: [] }, req, true));
      }

      return res.json(responseData("WALLET_FETCHED", { wallet, transactions }, req, true));
    } catch (err) {
      console.error("getWallet err", err);
      return res.json(responseData("SERVER_ERROR", {}, req, false));
    }
  }
};
