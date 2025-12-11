const User = require("../models/user.model");
const Driver = require("../models/driver.model");
const Admin = require("../models/admin.model");
const Transaction = require("../models/transactions.model");
const AdminSetting = require("../models/adminSetting.model");

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
  console.log("ensureWallets called with userId:", userId, "driverId:", driverId);
  
  if (userId) {
    const user = await User.findById(userId);
    if (!user) {
      console.log("User not found:", userId);
    } else {
      // Initialize wallet if not exists
      if (user.wallet === undefined || user.wallet === null) {
        user.wallet = 0;
        await user.save();
      }
      console.log("User wallet initialized:", user.wallet);
    }
  }

  if (driverId) {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      console.log("Driver not found:", driverId);
    } else {
      // Initialize wallet and commission if not exists
      if (driver.wallet === undefined || driver.wallet === null) {
        driver.wallet = 0;
      }
      if (driver.driverCommission === undefined || driver.driverCommission === null) {
        driver.driverCommission = 0;
      }
      await driver.save();
      console.log("Driver wallet initialized - wallet:", driver.wallet, "commission:", driver.driverCommission);
    }
  }

  // Ensure admin exists (get first admin or create default)
  const admin = await Admin.findOne({});
  if (admin) {
    if (admin.commission === undefined || admin.commission === null) {
      admin.commission = 0;
      await admin.save();
    }
    console.log("Admin commission initialized:", admin.commission);
  }
}

async function payByWallet(ride, userId, driverId, finalFare) {
  const user = await User.findById(userId);
  const driver = await Driver.findById(driverId);
  const admin = await Admin.findOne({});

  if (!user || !driver || !admin) {
    return { success: false, message: "USER_OR_DRIVER_OR_ADMIN_NOT_FOUND" };
  }

  const { adminCut, driverShare } = await computeShares(finalFare);

  // Round all amounts to 2 decimal places
  const roundedFinalFare = Number(finalFare.toFixed(2));
  const roundedAdminCut = Number(adminCut.toFixed(2));
  const roundedDriverShare = Number(driverShare.toFixed(2));

  // Check user wallet balance
  const userWalletBalance = Number((user.wallet || 0).toFixed(2));
  if (userWalletBalance < roundedFinalFare) {
    return { success: false, message: "INSUFFICIENT_WALLET_BALANCE" };
  }

  // Deduct from user wallet
  user.wallet = Number((userWalletBalance - roundedFinalFare).toFixed(2));
  await user.save();

  // Driver receives his share (70%) directly in driverCommission
  const currentDriverCommission = Number((driver.driverCommission || 0).toFixed(2));
  driver.driverCommission = Number((currentDriverCommission + roundedDriverShare).toFixed(2));
  await driver.save();

  // Create transaction: User pays Driver
  const userToDriverTx = await Transaction.create({
    rideIds: [ride._id],
    paidBy: "user",
    paidTo: "driver",
    paidById: userId,
    paidToId: driverId,
    paymentMethod: "wallet",
    paymentDetails: {
      walletTransactionId: `WLT-${Date.now()}-${ride._id}`
    },
    transactionType: "ride_payment",
    amount: roundedFinalFare,
    commissionAmount: roundedDriverShare,
    totalAmount: roundedFinalFare,
    status: "completed"
  });

  // Update ride: paidToDriver = true (as soon as driver transaction is created)
  ride.paidToDriver = true;
  ride.transactionId = userToDriverTx._id;
  if (!ride.paymentDetails) {
    ride.paymentDetails = {};
  }
  ride.paymentDetails.userPaidAmount = roundedFinalFare;
  ride.paymentDetails.driverReceivedAmount = roundedDriverShare;
  ride.driverReceivedAmount = roundedDriverShare;
  await ride.save();

  // Admin receives commission directly
  const currentAdminCommission = Number((admin.commission || 0).toFixed(2));
  admin.commission = Number((currentAdminCommission + roundedAdminCut).toFixed(2));
  await admin.save();

  // Create transaction: Admin commission
  const adminCommissionTx = await Transaction.create({
    rideIds: [ride._id],
    paidBy: "driver",
    paidTo: "admin",
    paidById: driverId,
    paidToId: admin._id || null,
    paymentMethod: "wallet",
    transactionType: "admin_commission",
    amount: roundedAdminCut,
    commissionAmount: 0,
    totalAmount: roundedAdminCut,
    status: "completed"
  });

  // Update ride: paidToAdmin = true (as soon as admin transaction is created)
  ride.paidToAdmin = true;
  if (!ride.paymentDetails) {
    ride.paymentDetails = {};
  }
  ride.paymentDetails.adminCommissionAmount = roundedAdminCut;
  ride.adminCommissionAmount = roundedAdminCut;
  
  // Both transactions successful - set paymentSuccessful and mark ride as completed
  ride.updatePaymentStatus();
  ride.status = "completed";
  ride.completedAt = new Date();
  await ride.save();

  return { success: true, transactionId: userToDriverTx._id, rideCompleted: true };
}

async function payByCash(ride, userId, driverId, finalFare) {
  console.log("payByCash called - driverId:", driverId, "finalFare:", finalFare);
  
  const driver = await Driver.findById(driverId);
  const admin = await Admin.findOne({});

  console.log("Driver found:", driver?._id);
  console.log("Admin found:", admin?._id);

  if (!driver || !admin) {
    console.log("DRIVER_OR_ADMIN_NOT_FOUND - driver:", !!driver, "admin:", !!admin);
    return { success: false, message: "DRIVER_OR_ADMIN_NOT_FOUND" };
  }

  const { adminCut, driverShare } = await computeShares(finalFare);
  console.log("Shares computed - adminCut:", adminCut, "driverShare:", driverShare);

  // Round all amounts to 2 decimal places
  const roundedFinalFare = Number(finalFare.toFixed(2));
  const roundedAdminCut = Number(adminCut.toFixed(2));
  const roundedDriverShare = Number(driverShare.toFixed(2));

  // Driver receives full fare in wallet (cash received from user)
  // Later, driver will settle with admin by paying commission
  const currentDriverWallet = Number((driver.wallet || 0).toFixed(2));
  driver.wallet = Number((currentDriverWallet + roundedFinalFare).toFixed(2));
  await driver.save();
  console.log("Driver wallet updated - wallet:", driver.wallet);

  // Create transaction: User pays Driver (cash)
  const userToDriverTx = await Transaction.create({
    rideIds: [ride._id],
    paidBy: "user",
    paidTo: "driver",
    paidById: userId,
    paidToId: driverId,
    paymentMethod: "cash",
    paymentDetails: {
      notes: "Cash payment received from user - driver will settle with admin later"
    },
    transactionType: "ride_payment",
    amount: roundedFinalFare,
    commissionAmount: roundedDriverShare,
    totalAmount: roundedFinalFare,
    status: "completed"
  });
  console.log("Transaction 1 created:", userToDriverTx._id);

  // Update ride: paidToDriver = true (as soon as driver transaction is created)
  ride.paidToDriver = true;
  ride.transactionId = userToDriverTx._id;
  if (!ride.paymentDetails) {
    ride.paymentDetails = {};
  }
  ride.paymentDetails.userPaidAmount = roundedFinalFare;
  ride.paymentDetails.driverReceivedAmount = roundedFinalFare; // Full fare for cash
  ride.driverReceivedAmount = roundedFinalFare; // Full fare for cash
  
  // Note: Admin commission will be paid when driver settles
  // For now, mark paidToAdmin as false (will be true after settlement)
  ride.paidToAdmin = false;
  ride.paymentDetails.adminCommissionAmount = roundedAdminCut;
  ride.adminCommissionAmount = roundedAdminCut;
  ride.updatePaymentStatus();
  
  // For cash payments, keep status as "reachedDestination" (not completed yet)
  // Ride will be marked as completed after driver settles with admin
  // Don't set completedAt here - it will be set after settlement
  await ride.save();

  console.log("Cash payment processed - driver will settle with admin later");

  return { success: true, transactionId: userToDriverTx._id, rideCompleted: false, needsSettlement: true };
}

// Driver settlement - driver pays admin for cash rides
// When driver settles, his share (70%) goes to driverCommission
async function driverSettlement(driverId, rideIds, paymentMethod, paymentDetails) {
  const Ride = require("../models/ride.model");
  const driver = await Driver.findById(driverId);
  const admin = await Admin.findOne({});

  if (!driver || !admin) {
    return { success: false, message: "DRIVER_OR_ADMIN_NOT_FOUND" };
  }

  // Calculate total commission amount for all rides
  let totalCommission = 0;
  const rides = await Ride.find({ _id: { $in: rideIds } });

  for (const ride of rides) {
    const finalFare = ride.finalFare || ride.estimatedFare;
    const { adminCut } = await computeShares(finalFare);
    totalCommission += adminCut;
  }

  // Round total commission to 2 decimal places
  const roundedTotalCommission = Number(totalCommission.toFixed(2));

  // Check if driver has enough in wallet to pay commission
  const currentDriverWallet = Number((driver.wallet || 0).toFixed(2));
  if (currentDriverWallet < roundedTotalCommission) {
    return { success: false, message: "INSUFFICIENT_WALLET_BALANCE" };
  }

  // Deduct commission from driver wallet
  driver.wallet = Number((currentDriverWallet - roundedTotalCommission).toFixed(2));
  
  // Calculate total driver share for all rides and add to driverCommission
  let totalDriverShare = 0;
  for (const ride of rides) {
    const finalFare = ride.finalFare || ride.estimatedFare;
    const { driverShare } = await computeShares(finalFare);
    totalDriverShare += driverShare;
  }
  const roundedTotalDriverShare = Number(totalDriverShare.toFixed(2));
  
  // Add driver's share to driverCommission
  const currentDriverCommission = Number((driver.driverCommission || 0).toFixed(2));
  driver.driverCommission = Number((currentDriverCommission + roundedTotalDriverShare).toFixed(2));
  await driver.save();

  // Add commission to admin
  const currentAdminCommission = Number((admin.commission || 0).toFixed(2));
  admin.commission = Number((currentAdminCommission + roundedTotalCommission).toFixed(2));
  await admin.save();

  // Create transaction (settlement processed)
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

  // Update all rides - mark as paid to admin and complete the rides
  for (const ride of rides) {
    ride.paidToAdmin = true;
    ride.transactionId = transaction._id;
    ride.updatePaymentStatus();
    // Mark ride as completed after settlement
    if (ride.paymentSuccessful) {
      ride.status = "completed";
      if (!ride.completedAt) {
        ride.completedAt = new Date();
      }
    }
    await ride.save();
  }

  return { success: true, transaction };
}

module.exports = {
  computeShares,
  ensureWallets,
  payByWallet,
  payByCash,
  driverSettlement
};
