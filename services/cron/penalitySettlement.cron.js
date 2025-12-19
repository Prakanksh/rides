const Admin = require("../../models/admin.model");
const driverModel = require("../../models/driver.model");
const Transaction = require("../../models/transactions.model");

async function penalitySettlementCron() {
  try {
    const drivers = await driverModel.find({ penalties: { $gt: 0 }, wallet: { $gt: 0 } });
const adminId = await Admin.findOne({ role: "admin" }).select("_id");
    for (const driver of drivers) {
      const deduction = Math.min(driver.wallet, driver.penalties);

      driver.wallet -= deduction;
      driver.penalties -= deduction;

      await driver.save();
    //   
     await Transaction.create({
        transactionType: "penality_settlement",
        amount: deduction,
        totalAmount: deduction,
        paidBy: "driver",
        paidTo: "admin",
        paidById: driver._id,
        paidToId: adminId, // admin system account (optional)
        paymentMethod: "wallet",
        driverId: driver._id,
        status: "completed",
        currency: "INR",
        paymentDetails: {
          notes: "Penalty settled via wallet"
        }
      });
    }
  } catch (error) {
    console.error("penalitySettlementCron error:", error);
  }
}

module.exports = {
  penalitySettlementCron
};
