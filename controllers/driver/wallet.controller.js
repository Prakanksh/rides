// controllers/driver/wallet.controller.js
const { responseData } = require("../../helpers/responseData");
const walletService = require("../../services/driver/wallet.service");

module.exports = {
  getWallet: async (req, res) => {
    try { await walletService.getWallet(req, res); } catch (e) { return res.json(responseData("SERVER_ERROR", {}, req, false)); }
  }
};
