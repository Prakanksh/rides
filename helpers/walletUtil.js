// helpers/walletUtil.js

const UserWallet = require("../models/userWallet.model");
const DriverWallet = require("../models/driverWallet.model");
const AdminWallet = require("../models/adminWallet.model");
const WalletTransaction = require("../models/walletTransaction.model");
const AdminSetting = require("../models/adminSetting.model");

// --------------------------------------------------------------------
// Compute admin + driver shares (standalone function)
// --------------------------------------------------------------------
async function computeShares(finalFare) {
  const settings = await AdminSetting.findOne({});
  const adminPercent = settings?.commissionPercentage || 30;
  const driverPercent = 100 - adminPercent;

  return {
    adminCut: Number(((finalFare * adminPercent) / 100).toFixed(2)),
    driverShare: Number(((finalFare * driverPercent) / 100).toFixed(2)),
  };
}

// --------------------------------------------------------------------
// Ensure user, driver & admin wallets exist
// --------------------------------------------------------------------
async function ensureWallets(userId, driverId) {
  console.log("ensureWallets called with userId:", userId, "driverId:", driverId);
  
  if (userId) {
    const userWallet = await UserWallet.findOneAndUpdate(
      { userId },
      { $setOnInsert: { mainBalance: 0 } },
      { upsert: true, new: true }
    );
    console.log("User wallet created/found:", userWallet?._id);
  }

  if (driverId) {
    const driverWallet = await DriverWallet.findOneAndUpdate(
      { driverId },
      { $setOnInsert: { mainBalance: 0, commissionBalance: 0 } },
      { upsert: true, new: true }
    );
    console.log("Driver wallet created/found:", driverWallet?._id);
  }

  const adminWallet = await AdminWallet.findOneAndUpdate(
    {},
    { $setOnInsert: { mainBalance: 0 } },
    { upsert: true, new: true }
  );
  console.log("Admin wallet created/found:", adminWallet?._id);
}

// --------------------------------------------------------------------
// PAYMENT METHOD = WALLET
// --------------------------------------------------------------------
async function payByWallet(ride, userId, driverId, finalFare) {
  const userWallet = await UserWallet.findOne({ userId });
  const driverWallet = await DriverWallet.findOne({ driverId });
  const adminWallet = await AdminWallet.findOne({});

  if (!userWallet || !driverWallet || !adminWallet) {
    return { success: false, message: "WALLET_NOT_FOUND" };
  }

  const { adminCut, driverShare } = await computeShares(finalFare);

  if (userWallet.mainBalance < finalFare) {
    return { success: false, message: "INSUFFICIENT_WALLET_BALANCE" };
  }

  // Deduct from user
  userWallet.mainBalance -= finalFare;
  await userWallet.save();

  // Admin commission
  adminWallet.mainBalance += adminCut;
  await adminWallet.save();

  // Driver earnings
  driverWallet.mainBalance += finalFare;
  driverWallet.commissionBalance += driverShare;
  await driverWallet.save();

  // Transaction logs
  await WalletTransaction.create({
    type: "ride_payment",
    userId,
    driverId,
    rideId: ride._id,
    amount: finalFare,
    commissionAmount: driverShare,
    method: "wallet",
    adminShareStatus: "settled"
  });

  await WalletTransaction.create({
    type: "admin_commission",
    rideId: ride._id,
    amount: adminCut,
    adminShareStatus: "settled"
  });

  return { success: true };
}

// --------------------------------------------------------------------
// PAYMENT METHOD = CASH
// --------------------------------------------------------------------
async function payByCash(ride, userId, driverId, finalFare) {
  console.log("payByCash called - driverId:", driverId, "finalFare:", finalFare);
  
  const driverWallet = await DriverWallet.findOne({ driverId });
  const adminWallet = await AdminWallet.findOne({});

  console.log("Driver wallet found:", driverWallet?._id);
  console.log("Admin wallet found:", adminWallet?._id);

  if (!driverWallet || !adminWallet) {
    console.log("WALLET_NOT_FOUND - driverWallet:", !!driverWallet, "adminWallet:", !!adminWallet);
    return { success: false, message: "WALLET_NOT_FOUND" };
  }

  const { adminCut, driverShare } = await computeShares(finalFare);
  console.log("Shares computed - adminCut:", adminCut, "driverShare:", driverShare);

  // Driver gets full fare instantly
  driverWallet.mainBalance += finalFare;
  driverWallet.commissionBalance += driverShare;
  await driverWallet.save();
  console.log("Driver wallet updated - mainBalance:", driverWallet.mainBalance);

  // Admin commission is PENDING (driver will pay later)
  const tx1 = await WalletTransaction.create({
    type: "ride_cash",
    userId,
    driverId,
    rideId: ride._id,
    amount: finalFare,
    commissionAmount: driverShare,
    method: "cash",
    adminShareStatus: "pending"
  });
  console.log("Transaction 1 created:", tx1._id);

  const tx2 = await WalletTransaction.create({
    type: "admin_commission",
    rideId: ride._id,
    amount: adminCut,
    adminShareStatus: "pending"
  });
  console.log("Transaction 2 created:", tx2._id);

  return { success: true };
}

module.exports = {
  computeShares,
  ensureWallets,
  payByWallet,
  payByCash
};
