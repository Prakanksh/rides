const cron = require("node-cron");
const { awsUrl } = require("../services/cron/cron");
const processCashSettlements = require("../services/cron/cashSettlement.cron");
const processWalletSettlements = require("../services/cron/walletSettlement.cron");
const { cashSettlementSchedule, walletSettlementSchedule,estimateRidesDeleteSchedule } = require("../configs/cron.config");
const { estimateRide } = require("../services/ride/ride.service");
const moment = require("moment");
const rideModel = require("../models/ride.model");
let crons = {
    deleteAwsUrl: async () => {
        console.log("CRON is running...")
        let job2 = cron.schedule("0 0 * * *", awsUrl);
        job2.start();
    },
    cashSettlement: async () => {
        console.log(`💰 Cash settlement cron scheduled: ${cashSettlementSchedule}`);
        let job = cron.schedule(cashSettlementSchedule, async () => {
            await processCashSettlements();
        });
        job.start();
    },
    walletSettlement: async () => {
        console.log(`💳 Wallet settlement cron scheduled: ${walletSettlementSchedule}`);
        let job = cron.schedule(walletSettlementSchedule, async () => {
            await processWalletSettlements();
        });
        job.start();
    },
    estimateRidesDelete: async () => {
        console.log(`Estimated Ride deleting: ${estimateRidesDeleteSchedule}`);
  const job = cron.schedule(estimateRidesDeleteSchedule, async () => {
  console.log("🧹 Cron: Deleting old estimating rides…");

  try {
    const cutoff = moment().subtract(1, "hours").toDate();

    const result = await rideModel.deleteMany({
      status: "estimating",         // <-- adjust based on your ride schema
      createdAt: { $lt: cutoff }
    });

    console.log(`🗑️ Deleted ${result.deletedCount} estimating rides older than 1 hours`);

  } catch (error) {
    console.error("❌ Cron error deleting estimating rides:", error);
  }
})
job.start();
}}
module.exports = crons;