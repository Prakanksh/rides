const mongoose = require('mongoose');
const Driver = require('../../models/driver.model');
const Admin = require('../../models/admin.model');
const Ride = require('../../models/ride.model');
const Transaction = require('../../models/transactions.model');
const AdminSetting = require('../../models/adminSetting.model');
const Notification = require('../../models/notification.model');
const sendNotification = require('../../helpers/firebase-admin');
const { sendEmail } = require('../../helpers/helper');
const { resolveRideFare } = require('../../helpers/walletUtil');
const _ = require('lodash');

async function sendNotificationAndroidIosDriver(receiverDriver, title, description) {
  await Notification.create({
    userId: receiverDriver?._id,
    userType: 'driver',
    title,
    description
  })
  // Firebase push notifications commented out for now
  // if (receiverDriver?.deviceType === 'android' && receiverDriver?.notifications) {
  //   if (!_.isEmpty(receiverDriver?.deviceToken)) {
  //     const messages = [
  //       {
  //         data: {
  //           title: title,
  //           body: description
  //         },
  //         token: receiverDriver?.deviceToken,
  //         android: { ttl: 10, priority: 'high' }
  //       }
  //     ]
  //     await sendNotification.sendNotifications(messages)
  //   }
  // }
  // if (receiverDriver?.deviceType === 'ios' && receiverDriver?.notifications) {
  //   if (!_.isEmpty(receiverDriver?.deviceToken)) {
  //     const messages = [
  //       {
  //         notification: {
  //           title: title,
  //           body: description
  //         },
  //         apns: {
  //           payload: {
  //             aps: {
  //               sound: 'default'
  //             }
  //           }
  //         },
  //         token: receiverDriver?.deviceToken,
  //         android: { ttl: 10, priority: 'high' }
  //       }
  //     ]
  //     await sendNotification.sendNotifications(messages)
  //   }
  // }
}

async function notifyDriverSettlementSuccess(driver, rideCount, totalFare, driverShare, adminShare) {
  try {
    const driverWithNotifications = await Driver.findById(driver._id)
      .select('_id firstName lastName email deviceType deviceToken notifications');

    if (!driverWithNotifications) {
      return;
    }

    const title = 'Wallet Payment Settled';
    const description = `Your wallet payment settlement is complete. ${rideCount} ride(s) settled. Your share: ₹${driverShare.toFixed(2)} has been added to your wallet.`;

    await sendNotificationAndroidIosDriver(driverWithNotifications, title, description);
  } catch (error) {
    console.error(`❌ Error notifying driver ${driver?._id}:`, error.message);
  }
}

async function notifyAdminInsufficientBalance(requiredAmount, availableAmount) {
  try {
    const admin = await Admin.findOne({});
    if (admin && admin.email) {
      const title = 'Insufficient Admin Commission Balance';
      const description = `Wallet payment settlement could not be processed. Required: ₹${requiredAmount.toFixed(2)}, Available in admin.commission: ₹${availableAmount.toFixed(2)}. Please ensure sufficient balance.`;
      
      // Send email notification to admin
      if (admin.email) {
        let dataBody = {
          email: admin.email,
          EMAIL: admin.email,
          TO_PAY: requiredAmount.toFixed(2),
          CURRENT_COMMISSION_BALANCE: availableAmount.toFixed(2)
        };
        await sendEmail('insufficient-wallet-balance', dataBody);
      }
      
      console.warn(`⚠️  ${description}`);
    }
  } catch (error) {
    console.error(`❌ Error notifying admin about insufficient balance:`, error.message);
  }
}

async function processWalletSettlements() {
  try {
    console.log("🔄 Starting wallet payment settlement cron job...");
    const startTime = Date.now();

    // Get admin commission percentage from settings
    const settings = await AdminSetting.findOne({});
    const adminPercent = settings?.commissionPercentage || 30;
    const driverPercent = 100 - adminPercent;

    // Find all completed wallet rides that haven't been marked as paymentSuccessful
    const unsettledWalletRides = await Ride.find({
      paymentMethod: "wallet",
      status: "completed",
      paymentSuccessful: false
    }).select("_id driver finalFare estimatedFare originalFare discountAmount paidToAdmin paidToDriver paymentDetails");

    if (unsettledWalletRides.length === 0) {
      console.log("ℹ️  No unsettled wallet rides found.");
      return;
    }

    console.log(`📊 Found ${unsettledWalletRides.length} unsettled wallet ride(s)...`);

    // Group rides by driver ID
    const ridesByDriver = {};
    for (const ride of unsettledWalletRides) {
      if (!ride.driver) {
        console.warn(`⚠️  Ride ${ride._id} has no driver assigned, skipping...`);
        continue;
      }
      const driverId = ride.driver.toString();
      if (!ridesByDriver[driverId]) {
        ridesByDriver[driverId] = [];
      }
      ridesByDriver[driverId].push(ride);
    }

    const driverIds = Object.keys(ridesByDriver);
    if (driverIds.length === 0) {
      console.log("ℹ️  No valid drivers found for wallet rides.");
      return;
    }

    console.log(`📋 Processing settlements for ${driverIds.length} driver(s)...`);

    // Get admin
    const admin = await Admin.findOne({});
    if (!admin) {
      console.error(`❌ Admin not found. Cannot process settlements.`);
      return;
    }

    let totalSettledDrivers = 0;
    let totalSettledRides = 0;
    let totalAdminAmount = 0;
    let totalDriverAmount = 0;
    let totalDeductedFromCommission = 0;

    // Process each driver
    for (const driverId of driverIds) {
      try {
        const rides = ridesByDriver[driverId];
        
        // Get driver
        const driver = await Driver.findById(driverId).select("_id firstName lastName wallet");
        if (!driver) {
          console.warn(`⚠️  Driver ${driverId} not found, skipping ${rides.length} ride(s)...`);
          continue;
        }

        // Calculate totals for this driver's rides
        let totalPaid = 0;
        let totalAdminShare = 0;
        let totalDriverShare = 0;
        const rideIds = [];

        for (const ride of rides) {
          const paid = resolveRideFare(ride, 0);
          const originalFare = Number((ride.originalFare > 0 ? ride.originalFare : paid).toFixed(2));
          const discountAmount = Number((ride.discountAmount || 0).toFixed(2));
          if (paid > 0 && originalFare > 0) {
            totalPaid += paid;
            const adminShare = Math.max(0, Number(((originalFare * adminPercent) / 100 - discountAmount).toFixed(2)));
            const driverShare = Number(((originalFare * driverPercent) / 100).toFixed(2));
            totalAdminShare += adminShare;
            totalDriverShare += driverShare;
            rideIds.push(ride._id);
          }
        }

        if (totalPaid <= 0 || rideIds.length === 0) {
          console.warn(`⚠️  Driver ${driver.firstName} ${driver.lastName}: No valid rides to settle`);
          continue;
        }

        const roundedTotalPaid = Number(totalPaid.toFixed(2));
        const roundedTotalAdminShare = Number(totalAdminShare.toFixed(2));
        const roundedTotalDriverShare = Number(totalDriverShare.toFixed(2));

        // Verify admin has enough commission balance
        const currentAdminCommission = Number((admin.commission || 0).toFixed(2));
        if (currentAdminCommission < roundedTotalPaid) {
          console.warn(`⚠️  Insufficient admin commission balance. Required: ₹${roundedTotalPaid.toFixed(2)}, Available: ₹${currentAdminCommission.toFixed(2)}`);
          
          await notifyAdminInsufficientBalance(roundedTotalPaid, currentAdminCommission);
          
          continue; // Skip this driver
        }

        // Ensure rideIds are valid ObjectIds
        const validRideIds = rideIds.filter(id => id && mongoose.Types.ObjectId.isValid(id));
        if (validRideIds.length !== rideIds.length) {
          console.warn(`⚠️  Some ride IDs are invalid. Valid: ${validRideIds.length}, Total: ${rideIds.length}`);
        }

        // Update admin: deduct total fare from commission, add admin share to wallet
        const newAdminCommission = Number((currentAdminCommission - roundedTotalPaid).toFixed(2));
        const currentAdminWallet = Number((admin.wallet || 0).toFixed(2));
        const newAdminWallet = Number((currentAdminWallet + roundedTotalAdminShare).toFixed(2));
        
        admin.commission = newAdminCommission;
        admin.wallet = newAdminWallet;
        await admin.save();
        
        // Verify admin update
        const updatedAdmin = await Admin.findById(admin._id);
        if (!updatedAdmin || updatedAdmin.commission !== newAdminCommission || updatedAdmin.wallet !== newAdminWallet) {
          console.error(`❌ Admin update verification failed`);
          throw new Error(`Admin update verification failed`);
        }

        // Update driver: add driver share to wallet
        const currentDriverWallet = Number((driver.wallet || 0).toFixed(2));
        const newDriverWallet = Number((currentDriverWallet + roundedTotalDriverShare).toFixed(2));
        
        driver.wallet = newDriverWallet;
        await driver.save();
        
        // Verify driver update
        const updatedDriver = await Driver.findById(driver._id);
        if (!updatedDriver || updatedDriver.wallet !== newDriverWallet) {
          console.error(`❌ Driver update verification failed for ${driver._id}`);
          throw new Error(`Driver update verification failed`);
        }

        // Create transaction from admin to driver
        const transaction = await Transaction.create({
          rideIds: validRideIds,
          paidBy: "admin",
          paidTo: "driver",
          paidById: admin._id,
          paidToId: driver._id,
          paymentMethod: "wallet",
          paymentDetails: {
            notes: `Automatic settlement for ${validRideIds.length} wallet ride(s) via cron job. Admin share: ₹${roundedTotalAdminShare.toFixed(2)}, Driver share: ₹${roundedTotalDriverShare.toFixed(2)}`
          },
          transactionType: "admin_commission",
          amount: roundedTotalDriverShare,
          commissionAmount: roundedTotalAdminShare,
          totalAmount: roundedTotalPaid,
          status: "completed"
        });

        // Update all rides to mark as paid to driver and set transaction ID
        // Note: paidToAdmin is already true for wallet payments, we just need to set paidToDriver
        // updatePaymentStatus() will then set paymentSuccessful = true
        const updateResult = await Ride.updateMany(
          { _id: { $in: validRideIds } },
          {
            $set: {
              paidToDriver: true,
              transactionId: transaction._id
            }
          }
        );
        
        console.log(`   - Updated ${updateResult.modifiedCount} ride(s) with paidToDriver=true`);
        if (updateResult.modifiedCount !== validRideIds.length) {
          console.warn(`⚠️  Expected to update ${validRideIds.length} rides but only ${updateResult.modifiedCount} were modified`);
          // Log which rides might not have been updated
          const updatedRides = await Ride.find({ _id: { $in: validRideIds }, paidToDriver: true });
          const updatedRideIds = updatedRides.map(r => r._id.toString());
          const notUpdated = validRideIds.filter(id => !updatedRideIds.includes(id.toString()));
          if (notUpdated.length > 0) {
            console.warn(`⚠️  Rides not updated: ${notUpdated.join(', ')}`);
          }
        }

        // Fetch updated rides and call updatePaymentStatus to set paymentSuccessful and paymentCompletedAt
        // This ensures paymentSuccessful is set correctly based on both paidToAdmin and paidToDriver
        const ridesToUpdate = await Ride.find({ _id: { $in: validRideIds } });
        
        if (ridesToUpdate.length !== validRideIds.length) {
          console.warn(`⚠️  Expected ${validRideIds.length} rides but found ${ridesToUpdate.length}`);
        }
        
        for (const ride of ridesToUpdate) {
          // Ensure paymentDetails exists
          if (!ride.paymentDetails) {
            ride.paymentDetails = {};
          }
          
          // Verify both paidToAdmin and paidToDriver are true before updating payment status
          // For wallet rides, paidToAdmin should already be true (set when ride was completed)
          if (ride.paidToAdmin && ride.paidToDriver) {
            // Update payment status (this will set paymentSuccessful = true and paymentCompletedAt)
            ride.updatePaymentStatus();
            await ride.save();
          } else {
            console.warn(`⚠️  Ride ${ride._id}: paidToAdmin=${ride.paidToAdmin}, paidToDriver=${ride.paidToDriver} - skipping payment status update`);
          }
        }

        totalSettledDrivers++;
        totalSettledRides += validRideIds.length;
        totalAdminAmount += roundedTotalAdminShare;
        totalDriverAmount += roundedTotalDriverShare;
        totalDeductedFromCommission += roundedTotalPaid;

        console.log(`✅ Driver ${driver.firstName} ${driver.lastName} (${driver._id}):`);
        console.log(`   - Settled ${validRideIds.length} ride(s), Total paid: ₹${roundedTotalPaid.toFixed(2)}`);
        console.log(`   - Deducted ₹${roundedTotalPaid.toFixed(2)} from admin.commission`);
        console.log(`   - Admin share (${adminPercent}%): ₹${roundedTotalAdminShare.toFixed(2)} → admin.wallet`);
        console.log(`   - Driver share (${driverPercent}%): ₹${roundedTotalDriverShare.toFixed(2)} → driver.wallet`);

        await notifyDriverSettlementSuccess(
          driver,
          validRideIds.length,
          roundedTotalPaid,
          roundedTotalDriverShare,
          roundedTotalAdminShare
        );

      } catch (driverError) {
        console.error(`❌ Error processing driver ${driverId}:`, driverError.message);
        console.error(driverError.stack);
        // Continue with next driver
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log("\n📈 Settlement Summary:");
    console.log(`   - Drivers processed: ${totalSettledDrivers}`);
    console.log(`   - Total rides settled: ${totalSettledRides}`);
    console.log(`   - Total deducted from admin.commission: ₹${totalDeductedFromCommission.toFixed(2)}`);
    console.log(`   - Total admin amount: ₹${totalAdminAmount.toFixed(2)} (added to admin.wallet)`);
    console.log(`   - Total driver amount: ₹${totalDriverAmount.toFixed(2)} (added to driver.wallet)`);
    console.log(`   - Execution time: ${duration}s`);
    console.log("✅ Wallet payment settlement cron job completed.\n");

  } catch (error) {
    console.error("❌ Error during wallet settlement cron job:", error.message);
    console.error(error.stack);
  }
}

module.exports = processWalletSettlements;

