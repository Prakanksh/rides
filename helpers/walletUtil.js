const User = require("../models/user.model");
const Driver = require("../models/driver.model");
const Admin = require("../models/admin.model");
const Transaction = require("../models/transactions.model");
const AdminSetting = require("../models/adminSetting.model");
const { calculateActualTime } = require("./etaCalculator");
const { updatePromoCodeUsage } = require("./promoUtil");

function normalizeVehicleTypeForEstimate(vehicleType) {
  if (!vehicleType) return null;
  if (vehicleType === "prime sedan") return "prime-sedan";
  return vehicleType;
}

function resolveRideFare(ride, overrideFare) {
  const o = Number(overrideFare || 0);
  if (o > 0) return o;

  const finalFare = Number(ride?.finalFare || 0);
  if (finalFare > 0) return finalFare;

  const est = ride?.estimatedFare;
  if (typeof est === "number") return Number(est || 0);

  if (Array.isArray(est) && est.length > 0) {
    const vt = normalizeVehicleTypeForEstimate(ride?.vehicleType);
    const match = vt ? est.find((x) => normalizeVehicleTypeForEstimate(x?.vehicleType) === vt) : null;
    const fromMatch = Number(match?.estimatedFare || 0);
    if (fromMatch > 0) return fromMatch;
  }

  return 0;
}

async function computeShares(finalFare) {
  const settings = await AdminSetting.findOne({});
  const adminPercent = settings?.commissionPercentage || 30;
  const driverPercent = 100 - adminPercent;

  return {
    adminCut: Number(((finalFare * adminPercent) / 100).toFixed(2)),
    driverShare: Number(((finalFare * driverPercent) / 100).toFixed(2)),
  };
}

async function ensureWallets(userId, driverId) {
  if (userId) {
    const user = await User.findById(userId);
    if (user && (user.wallet === undefined || user.wallet === null)) {
      user.wallet = 0;
      await user.save();
    }
  }

  if (driverId) {
    const driver = await Driver.findById(driverId);
    if (driver) {
      if (driver.wallet === undefined || driver.wallet === null) driver.wallet = 0;
      if (driver.driverCommission === undefined || driver.driverCommission === null) driver.driverCommission = 0;
      await driver.save();
    }
  }

  const admin = await Admin.findOne({});
  if (admin) {
    if (admin.commission === undefined || admin.commission === null) {
      admin.commission = 0;
    }
    if (admin.wallet === undefined || admin.wallet === null) {
      admin.wallet = 0;
    }
    await admin.save();
  }
}

async function payByWallet(ride, userId, driverId, finalFare) {
  const user = await User.findById(userId);
  const admin = await Admin.findOne({});

  if (!user || !admin) {
    return { success: false, message: "USER_OR_ADMIN_NOT_FOUND" };
  }

  const fareToUse = resolveRideFare(ride, finalFare);
  if (fareToUse <= 0) {
    return { success: false, message: "INVALID_FARE_AMOUNT" };
  }

  const roundedFinalFare = Number(fareToUse.toFixed(2));
  const roundedOriginalFare = Number((Number(ride.originalFare || 0) || roundedFinalFare).toFixed(2));
  const roundedDiscountAmount = Number((Number(ride.discountAmount || 0) || 0).toFixed(2));

  const userWalletBalance = Number((user.wallet || 0).toFixed(2));
  if (userWalletBalance < roundedFinalFare) {
    return { success: false, message: "INSUFFICIENT_WALLET_BALANCE" };
  }

  user.wallet = Number((userWalletBalance - roundedFinalFare).toFixed(2));
  await user.save();

  // For wallet rides: user payment goes to admin.commission now; nightly cron settles to driver/admin wallets.
  // Shares are computed from the original fare; promo discount reduces admin share only.
  const { adminCut, driverShare } = await computeShares(roundedOriginalFare);
  const roundedAdminCut = Number(adminCut.toFixed(2));
  const roundedDriverShare = Number(driverShare.toFixed(2));
  const finalAdminShare = Math.max(0, Number((roundedAdminCut - roundedDiscountAmount).toFixed(2)));

  const currentAdminCommission = Number((admin.commission || 0).toFixed(2));
  admin.commission = Number((currentAdminCommission + roundedFinalFare).toFixed(2));
  await admin.save();

  let userToAdminTx;
  try {
    userToAdminTx = await Transaction.create({
      rideIds: [ride._id],
      paidBy: "user",
      paidTo: "admin",
      paidById: userId,
      paidToId: admin._id || null,
      paymentMethod: "wallet",
      paymentDetails: { walletTransactionId: `WLT-${Date.now()}-${ride._id}` },
      transactionType: "ride_payment",
      amount: roundedFinalFare,
      commissionAmount: 0,
      totalAmount: roundedFinalFare,
      status: "completed"
    });
  } catch (error) {
    console.error("Transaction creation failed:", error.message);
    return { success: false, message: "TRANSACTION_CREATION_FAILED", error: error.message };
  }

  ride.paidToAdmin = true;
  ride.paidToDriver = false; // set by nightly wallet settlement cron
  ride.transactionId = userToAdminTx._id;
  if (!ride.paymentDetails) ride.paymentDetails = {};
  ride.paymentDetails.userPaidAmount = roundedFinalFare;
  ride.paymentDetails.driverReceivedAmount = roundedDriverShare;
  ride.driverReceivedAmount = roundedDriverShare;
  ride.paymentDetails.adminCommissionAmount = finalAdminShare;
  ride.adminCommissionAmount = finalAdminShare;
  ride.paymentDetails.discountAmount = roundedDiscountAmount;
  ride.paymentDetails.originalFare = roundedOriginalFare;
  ride.paymentDetails.promoCode = ride.promoCode || null;
  ride.updatePaymentStatus();
  ride.status = "completed";
  ride.completedAt = new Date();
  
  if (!ride.actualCompletionTime && ride.startedAt) {
    ride.actualCompletionTime = ride.completedAt;
    ride.actualTime = calculateActualTime(ride.startedAt, ride.completedAt);
  }
  
  await ride.save();

  if (ride.promoCode) {
    await updatePromoCodeUsage(ride.promoCode, userId);
  }

  // driver availability is handled on ride completion, not settlement
  if (driverId) await Driver.findByIdAndUpdate(driverId, { isAvailable: true });

  return { success: true, transactionId: userToAdminTx._id, rideCompleted: true };
}

async function payByCash(ride, userId, driverId, finalFare) {
  const driver = await Driver.findById(driverId);
  if (!driver) {
    return { success: false, message: "DRIVER_NOT_FOUND" };
  }

  const fareToUse = resolveRideFare(ride, finalFare);
  if (fareToUse <= 0) {
    return { success: false, message: "INVALID_FARE_AMOUNT" };
  }

  // Use originalFare if available (for promo discount calculation), otherwise use finalFare
  const originalFare = ride.originalFare > 0 ? ride.originalFare : fareToUse;
  const discountAmount = ride.discountAmount || 0;
  const roundedFinalFare = Number(fareToUse.toFixed(2));
  const roundedOriginalFare = Number(originalFare.toFixed(2));
  const roundedDiscountAmount = Number(discountAmount.toFixed(2));

  // Calculate shares from original fare (before discount)
  const { adminCut, driverShare } = await computeShares(roundedOriginalFare);
  const roundedAdminCut = Number(adminCut.toFixed(2));
  const roundedDriverShare = Number(driverShare.toFixed(2));
  
  // Deduct discount from admin share
  const finalAdminShare = Math.max(0, Number((roundedAdminCut - roundedDiscountAmount).toFixed(2)));

  // Driver receives full share from original fare (not discounted)
  const currentDriverCommission = Number((driver.driverCommission || 0).toFixed(2));
  const newDriverCommission = Number((currentDriverCommission + roundedDriverShare).toFixed(2));
  driver.driverCommission = newDriverCommission;
  
  try {
    await driver.save();
    const savedDriver = await Driver.findById(driverId);
    if (!savedDriver) {
      return { success: false, message: "DRIVER_NOT_FOUND_AFTER_SAVE" };
    }
    if (Math.abs(savedDriver.driverCommission - newDriverCommission) > 0.01) {
      return { success: false, message: "DRIVER_COMMISSION_UPDATE_FAILED" };
    }
  } catch (error) {
    console.error("Error saving driver commission:", error);
    return { success: false, message: "DRIVER_COMMISSION_UPDATE_FAILED", error: error.message };
  }

  let userToDriverTx;
  try {
    userToDriverTx = await Transaction.create({
      rideIds: [ride._id],
      paidBy: "user",
      paidTo: "driver",
      paidById: userId,
      paidToId: driverId,
      paymentMethod: "cash",
      paymentDetails: { notes: "Cash payment received from user" },
      transactionType: "ride_payment",
      amount: roundedFinalFare,
      commissionAmount: roundedFinalFare,
      totalAmount: roundedFinalFare,
      status: "completed"
    });
  } catch (error) {
    console.error("Transaction creation failed:", error.message);
    return { success: false, message: "TRANSACTION_CREATION_FAILED", error: error.message };
  }

  ride.paidToDriver = true;
  ride.transactionId = userToDriverTx._id;
  if (!ride.paymentDetails) ride.paymentDetails = {};
  ride.paymentDetails.userPaidAmount = roundedFinalFare;
  ride.paymentDetails.driverReceivedAmount = roundedDriverShare;
  ride.driverReceivedAmount = roundedDriverShare;
  ride.paymentDetails.adminCommissionAmount = finalAdminShare;
  ride.adminCommissionAmount = finalAdminShare;
  ride.paymentDetails.discountAmount = roundedDiscountAmount;
  ride.paymentDetails.originalFare = roundedOriginalFare;
  ride.paymentDetails.promoCode = ride.promoCode || null;
  ride.updatePaymentStatus();
  ride.status = "completed";
  ride.completedAt = new Date();
  
  if (!ride.actualCompletionTime && ride.startedAt) {
    ride.actualCompletionTime = ride.completedAt;
    ride.actualTime = calculateActualTime(ride.startedAt, ride.completedAt);
  }
  
  await ride.save();

  if (ride.promoCode) {
    await updatePromoCodeUsage(ride.promoCode, userId);
  }

  if (driverId) {
    await Driver.findByIdAndUpdate(driverId, { isAvailable: true });
  }

  return { success: true, transactionId: userToDriverTx._id, rideCompleted: true };
}

async function confirmCashPayment(ride, userId, driverId, finalFare) {
  const driver = await Driver.findById(driverId);
  if (!driver) {
    return { success: false, message: "DRIVER_NOT_FOUND" };
  }

  const fareToUse = resolveRideFare(ride, finalFare);
  if (fareToUse <= 0) {
    return { success: false, message: "INVALID_FARE_AMOUNT" };
  }

  const originalFare = ride.originalFare > 0 ? ride.originalFare : fareToUse;
  const discountAmount = ride.discountAmount || 0;
  const roundedFinalFare = Number(fareToUse.toFixed(2));
  const roundedOriginalFare = Number(originalFare.toFixed(2));
  const roundedDiscountAmount = Number(discountAmount.toFixed(2));

  const { adminCut, driverShare } = await computeShares(roundedOriginalFare);
  const roundedAdminCut = Number(adminCut.toFixed(2));
  const roundedDriverShare = Number(driverShare.toFixed(2));
  const finalAdminShare = Math.max(0, Number((roundedAdminCut - roundedDiscountAmount).toFixed(2)));

  const currentDriverCommission = Number((driver.driverCommission || 0).toFixed(2));
  const newDriverCommission = Number((currentDriverCommission + roundedDriverShare).toFixed(2));
  driver.driverCommission = newDriverCommission;
  
  try {
    await driver.save();
    
    const savedDriver = await Driver.findById(driverId);
    if (!savedDriver || savedDriver.driverCommission !== newDriverCommission) {
      console.error("Driver commission save verification failed");
      return { success: false, message: "DRIVER_COMMISSION_UPDATE_FAILED" };
    }
  } catch (error) {
    console.error("Error saving driver commission:", error);
    return { success: false, message: "DRIVER_COMMISSION_UPDATE_FAILED", error: error.message };
  }

  let userToDriverTx;
  try {
    userToDriverTx = await Transaction.create({
      rideIds: [ride._id],
      paidBy: "user",
      paidTo: "driver",
      paidById: userId,
      paidToId: driverId,
      paymentMethod: "cash",
      paymentDetails: { notes: "Cash payment received from user" },
      transactionType: "ride_payment",
      amount: roundedFinalFare,
      commissionAmount: roundedFinalFare,
      totalAmount: roundedFinalFare,
      status: "completed"
    });
  } catch (error) {
    console.error("Transaction creation failed:", error.message);
    return { success: false, message: "TRANSACTION_CREATION_FAILED", error: error.message };
  }

  ride.paidToDriver = true;
  ride.transactionId = userToDriverTx._id;
  if (!ride.paymentDetails) ride.paymentDetails = {};
  ride.paymentDetails.userPaidAmount = roundedFinalFare;
  ride.paymentDetails.driverReceivedAmount = roundedDriverShare;
  ride.driverReceivedAmount = roundedDriverShare;
  ride.paymentDetails.adminCommissionAmount = finalAdminShare;
  ride.adminCommissionAmount = finalAdminShare;
  ride.paymentDetails.discountAmount = roundedDiscountAmount;
  ride.paymentDetails.originalFare = roundedOriginalFare;
  ride.paymentDetails.promoCode = ride.promoCode || null;
  ride.updatePaymentStatus();
  ride.status = "completed";
  ride.completedAt = new Date();
  
  if (!ride.actualCompletionTime && ride.startedAt) {
    ride.actualCompletionTime = ride.completedAt;
    ride.actualTime = calculateActualTime(ride.startedAt, ride.completedAt);
  }
  
  await ride.save();

  if (ride.promoCode) {
    await updatePromoCodeUsage(ride.promoCode, userId);
  }

  if (driverId) {
    await Driver.findByIdAndUpdate(driverId, { isAvailable: true });
  }

  return { success: true, transactionId: userToDriverTx._id, rideCompleted: true };
}

async function driverSettlement(driverId, rideIds, paymentMethod, paymentDetails) {
  const Ride = require("../models/ride.model");
  const driver = await Driver.findById(driverId);
  const admin = await Admin.findOne({});

  if (!driver || !admin) {
    return { success: false, message: "DRIVER_OR_ADMIN_NOT_FOUND" };
  }

  let totalCommission = 0;
  const rides = await Ride.find({ _id: { $in: rideIds } });

  for (const ride of rides) {
    const finalFare = resolveRideFare(ride, 0);
    const { adminCut } = await computeShares(finalFare);
    totalCommission += adminCut;
  }

  const roundedTotalCommission = Number(totalCommission.toFixed(2));
  const currentDriverWallet = Number((driver.wallet || 0).toFixed(2));
  if (currentDriverWallet < roundedTotalCommission) {
    return { success: false, message: "INSUFFICIENT_WALLET_BALANCE" };
  }

  driver.wallet = Number((currentDriverWallet - roundedTotalCommission).toFixed(2));
  
  let totalDriverShare = 0;
  for (const ride of rides) {
    const finalFare = resolveRideFare(ride, 0);
    const { driverShare } = await computeShares(finalFare);
    totalDriverShare += driverShare;
  }
  const roundedTotalDriverShare = Number(totalDriverShare.toFixed(2));
  
  const currentDriverCommission = Number((driver.driverCommission || 0).toFixed(2));
  driver.driverCommission = Number((currentDriverCommission + roundedTotalDriverShare).toFixed(2));
  await driver.save();

  const currentAdminCommission = Number((admin.commission || 0).toFixed(2));
  admin.commission = Number((currentAdminCommission + roundedTotalCommission).toFixed(2));
  await admin.save();

  const transaction = await Transaction.create({
    rideIds: rideIds,
    paidBy: "driver",
    paidTo: "admin",
    paidById: driverId,
    paidToId: admin._id || null,
    paymentMethod: paymentMethod || "cash",
    paymentDetails: paymentDetails || { notes: "Driver settlement for cash rides" },
    transactionType: "driver_settlement",
    amount: roundedTotalCommission,
    commissionAmount: 0,
    totalAmount: roundedTotalCommission,
    status: "completed"
  });

  for (const ride of rides) {
    ride.paidToAdmin = true;
    ride.transactionId = transaction._id;
    ride.updatePaymentStatus();
    if (ride.paymentSuccessful) {
      ride.status = "completed";
      if (!ride.completedAt) ride.completedAt = new Date();
    }
    await ride.save();
  }

  return { success: true, transaction };
}

module.exports = {
  computeShares,
  resolveRideFare,
  ensureWallets,
  payByWallet,
  payByCash,
  confirmCashPayment,
  driverSettlement
};
