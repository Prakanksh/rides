const mongoose = require('mongoose');
const Driver = require('../../models/driver.model');
const Admin = require('../../models/admin.model');
const Ride = require('../../models/ride.model');
const Transaction = require('../../models/transactions.model');
const AdminSetting = require('../../models/adminSetting.model');
const Notification = require('../../models/notification.model');
const sendNotification = require('../../helpers/firebase-admin');
const { sendEmail } = require('../../helpers/helper');
const _ = require('lodash');

/**
 * ============================================
 * NOTIFICATION FUNCTIONS (Built exactly like sendNotificationAndroidIos)
 * ============================================
 */

/**
 * Send notification to driver (Android & iOS) - Built exactly like sendNotificationAndroidIos
 * @param {Object} receiverDriver - Driver object with deviceType, deviceToken, notifications fields
 * @param {String} title - Notification title
 * @param {String} description - Notification description
 */
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

/**
 * Send settlement success notification to driver
 * @param {Object} driver - Driver object
 * @param {Number} rideCount - Number of rides settled
 * @param {Number} totalFare - Total fare amount
 * @param {Number} driverShare - Driver's share amount
 * @param {Number} adminShare - Admin's share amount
 */
async function notifyDriverSettlementSuccess(driver, rideCount, totalFare, driverShare, adminShare) {
  try {
    const driverWithNotifications = await Driver.findById(driver._id)
      .select('_id firstName lastName email deviceType deviceToken notifications');

    if (!driverWithNotifications) {
      return;
    }

    const title = 'Cash Payment Settled';
    const description = `Your cash payment settlement is complete. ${rideCount} ride(s) settled. Your share: ₹${driverShare.toFixed(2)} has been added to your wallet.`;

    await sendNotificationAndroidIosDriver(driverWithNotifications, title, description);
  } catch (error) {
    console.error(`❌ Error notifying driver ${driver?._id}:`, error.message);
  }
}

/**
 * Send insufficient balance notification to driver
 * @param {Object} driver - Driver object
 * @param {Number} requiredAmount - Required amount
 * @param {Number} availableAmount - Available amount in driverCommission
 */
async function notifyDriverInsufficientBalance(driver, requiredAmount, availableAmount) {
  try {
    const driverWithNotifications = await Driver.findById(driver._id)
      .select('_id firstName lastName email deviceType deviceToken notifications');

    if (!driverWithNotifications) {
      return;
    }

    const title = 'Insufficient Balance for Settlement';
    const description = `Your cash payment settlement could not be processed. Required: ₹${requiredAmount.toFixed(2)}, Available: ₹${availableAmount.toFixed(2)}. Please ensure sufficient balance.`;

    await sendNotificationAndroidIosDriver(driverWithNotifications, title, description);
  } catch (error) {
    console.error(`❌ Error notifying driver ${driver?._id} about insufficient balance:`, error.message);
  }
}

/**
 * ============================================
 * END OF NOTIFICATION FUNCTIONS
 * ============================================
 */

/**
 * Cash Settlement Cron Job
 * 
 * This cron job processes cash payment settlements for all drivers:
 * 1. Finds all completed cash rides that haven't been settled to admin
 * 2. For each driver, calculates total fare and splits it:
 *    - Admin's share (30%) goes to admin.wallet
 *    - Driver's share (70%) goes to driver.wallet
 * 3. Deducts total fare from driver.driverCommission
 * 4. Creates a transaction from driver to admin
 * 5. Marks rides as paidToAdmin: true and paymentSuccessful: true
 * 6. Sends notifications to drivers (if enabled)
 */
async function processCashSettlements() {
  try {
    console.log("🔄 Starting cash payment settlement cron job...");
    const startTime = Date.now();

    // Get admin commission percentage from settings
    const settings = await AdminSetting.findOne({});
    const adminPercent = settings?.commissionPercentage || 30;
    const driverPercent = 100 - adminPercent;

    // Get all active drivers with driverCommission field
    const drivers = await Driver.find({
      status: "active",
      registrationStatus: "approved"
    }).select("_id firstName lastName driverCommission wallet");

    if (drivers.length === 0) {
      console.log("ℹ️  No active drivers found.");
      return;
    }

    console.log(`📊 Processing settlements for ${drivers.length} drivers...`);

    let totalSettledDrivers = 0;
    let totalSettledRides = 0;
    let totalAdminAmount = 0;
    let totalDriverAmount = 0;

    // Process each driver
    for (const driver of drivers) {
      try {
        // Find all completed cash rides for this driver that haven't been settled to admin
        const unsettledCashRides = await Ride.find({
          driver: driver._id,
          paymentMethod: "cash",
          status: "completed",
          paidToDriver: true,
          paidToAdmin: false
        }).select("_id finalFare estimatedFare");

        if (unsettledCashRides.length === 0) {
          continue; // Skip drivers with no unsettled cash rides
        }

        // Calculate total fare, admin share, and driver share for this driver's rides
        let totalFare = 0;
        let totalAdminShare = 0;
        let totalDriverShare = 0;
        const rideIds = [];

        for (const ride of unsettledCashRides) {
          const fare = ride.finalFare || ride.estimatedFare || 0;
          if (fare > 0) {
            totalFare += fare;
            const adminShare = Number(((fare * adminPercent) / 100).toFixed(2));
            const driverShare = Number(((fare * driverPercent) / 100).toFixed(2));
            totalAdminShare += adminShare;
            totalDriverShare += driverShare;
            rideIds.push(ride._id);
          }
        }

        if (totalFare <= 0 || rideIds.length === 0) {
          continue; // Skip if no valid rides
        }

        const roundedTotalFare = Number(totalFare.toFixed(2));
        const roundedTotalAdminShare = Number(totalAdminShare.toFixed(2));
        const roundedTotalDriverShare = Number(totalDriverShare.toFixed(2));
        
        // Ensure rideIds are valid ObjectIds
        const validRideIds = rideIds.filter(id => id && mongoose.Types.ObjectId.isValid(id));
        if (validRideIds.length !== rideIds.length) {
          console.warn(`⚠️  Some ride IDs are invalid. Valid: ${validRideIds.length}, Total: ${rideIds.length}`);
        }

        // Verify driver has enough commission balance
        const currentDriverCommission = Number((driver.driverCommission || 0).toFixed(2));
        if (currentDriverCommission < roundedTotalFare) {
          console.warn(`⚠️  Driver ${driver.firstName} ${driver.lastName} (${driver._id}): Insufficient commission balance. Required: ₹${roundedTotalFare.toFixed(2)}, Available: ₹${currentDriverCommission.toFixed(2)}`);
          
          await notifyDriverInsufficientBalance(driver, roundedTotalFare, currentDriverCommission);
          
          continue; // Skip this driver
        }

        // Get admin
        const admin = await Admin.findOne({});
        if (!admin) {
          console.error(`❌ Admin not found. Skipping driver ${driver._id}`);
          continue;
        }

        // Update driver: deduct total fare from driverCommission, add driver share to wallet
        const newDriverCommission = Number((currentDriverCommission - roundedTotalFare).toFixed(2));
        const currentDriverWallet = Number((driver.wallet || 0).toFixed(2));
        const newDriverWallet = Number((currentDriverWallet + roundedTotalDriverShare).toFixed(2));
        
        driver.driverCommission = newDriverCommission;
        driver.wallet = newDriverWallet;
        await driver.save();
        
        // Verify driver update
        const updatedDriver = await Driver.findById(driver._id);
        if (!updatedDriver || updatedDriver.driverCommission !== newDriverCommission || updatedDriver.wallet !== newDriverWallet) {
          console.error(`❌ Driver update verification failed for ${driver._id}`);
          throw new Error(`Driver update verification failed`);
        }

        // Update admin: add admin share to wallet
        const currentAdminWallet = Number((admin.wallet || 0).toFixed(2));
        const newAdminWallet = Number((currentAdminWallet + roundedTotalAdminShare).toFixed(2));
        admin.wallet = newAdminWallet;
        await admin.save();
        
        // Verify admin update
        const updatedAdmin = await Admin.findById(admin._id);
        if (!updatedAdmin || updatedAdmin.wallet !== newAdminWallet) {
          console.error(`❌ Admin update verification failed`);
          throw new Error(`Admin update verification failed`);
        }

        // Create transaction from driver to admin
        const transaction = await Transaction.create({
          rideIds: validRideIds,
          paidBy: "driver",
          paidTo: "admin",
          paidById: driver._id,
          paidToId: admin._id,
          paymentMethod: "cash",
          paymentDetails: {
            notes: `Automatic settlement for ${rideIds.length} cash ride(s) via cron job. Admin share: ₹${roundedTotalAdminShare.toFixed(2)}, Driver share: ₹${roundedTotalDriverShare.toFixed(2)}`
          },
          transactionType: "admin_commission",
          amount: roundedTotalAdminShare,
          commissionAmount: roundedTotalAdminShare,
          totalAmount: roundedTotalFare,
          status: "completed"
        });

        // Update all rides to mark as paid to admin and set transaction ID
        // Note: We don't set paymentSuccessful here - let updatePaymentStatus() handle it
        const updateResult = await Ride.updateMany(
          { _id: { $in: validRideIds } },
          {
            $set: {
              paidToAdmin: true,
              transactionId: transaction._id
            }
          }
        );
        
        console.log(`   - Updated ${updateResult.modifiedCount} ride(s) with paidToAdmin=true`);
        if (updateResult.modifiedCount !== validRideIds.length) {
          console.warn(`⚠️  Expected to update ${validRideIds.length} rides but only ${updateResult.modifiedCount} were modified`);
          // Log which rides might not have been updated
          const updatedRides = await Ride.find({ _id: { $in: validRideIds }, paidToAdmin: true });
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
          // For cash rides, paidToDriver should already be true (set when ride was completed)
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

        console.log(`✅ Driver ${driver.firstName} ${driver.lastName} (${driver._id}):`);
        console.log(`   - Settled ${validRideIds.length} ride(s), Total fare: ₹${roundedTotalFare.toFixed(2)}`);
        console.log(`   - Admin share (${adminPercent}%): ₹${roundedTotalAdminShare.toFixed(2)} → admin.wallet`);
        console.log(`   - Driver share (${driverPercent}%): ₹${roundedTotalDriverShare.toFixed(2)} → driver.wallet`);
        console.log(`   - Deducted ₹${roundedTotalFare.toFixed(2)} from driver.driverCommission`);

        await notifyDriverSettlementSuccess(
          driver,
          rideIds.length,
          roundedTotalFare,
          roundedTotalDriverShare,
          roundedTotalAdminShare
        );

      } catch (driverError) {
        console.error(`❌ Error processing driver ${driver._id}:`, driverError.message);
        console.error(driverError.stack);
        // Continue with next driver
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log("\n📈 Settlement Summary:");
    console.log(`   - Drivers processed: ${totalSettledDrivers}`);
    console.log(`   - Total rides settled: ${totalSettledRides}`);
    console.log(`   - Total admin amount: ₹${totalAdminAmount.toFixed(2)} (added to admin.wallet)`);
    console.log(`   - Total driver amount: ₹${totalDriverAmount.toFixed(2)} (added to driver.wallet)`);
    console.log(`   - Execution time: ${duration}s`);
    console.log("✅ Cash payment settlement cron job completed.\n");

  } catch (error) {
    console.error("❌ Error during cash settlement cron job:", error.message);
    console.error(error.stack);
  }
}

module.exports = processCashSettlements;

