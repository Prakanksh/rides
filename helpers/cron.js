const cron = require("node-cron");
const { awsUrl } = require("../services/cron/cron");
const processCashSettlements = require("../services/cron/cashSettlement.cron");
const processWalletSettlements = require("../services/cron/walletSettlement.cron");
const { cashSettlementSchedule, walletSettlementSchedule,estimateRidesDeleteSchedule } = require("../configs/cron.config");
const { estimateRide } = require("../services/ride/ride.service");
const moment = require("moment");
const rideModel = require("../models/ride.model");
const { activateScheduledRides } = require("../services/cron/scheduledRides.cron");
const { autoCancelRides } = require("../services/cron/autoCancelRides.cron");
const { penalitySettlementCron } = require("../services/cron/penalitySettlement.cron");
const { recoverDriverAvailability } = require("../services/cron/recoverDriverAvailability.cron");
const { calculateSurgeHeatmap, cleanupOldSurgeData } = require("../services/cron/calculateSurge.cron");
// const { cashSettlementSchedule, walletSettlementSchedule } = require("../configs/cron.config");

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
},
    scheduledRidesActivation: async () => {
        console.log("📅 Scheduled rides activation cron: Every 1 minute");
        let job = cron.schedule("* * * * *", async () => {
            await activateScheduledRides();
        });
        job.start();
    },
    autoCancelRides: async () => {
        console.log("🚫 Auto-cancel rides cron: Every 2 minutes");
        let job = cron.schedule("*/2 * * * *", async () => {
            await autoCancelRides();
        });
        job.start();
    },
    penalitySettlement: async () => {
        console.log("⚖️ Penality settlement cron: Every day at midnight");
        let job = cron.schedule("*/1 * * * *", async () => {
            console.log("Penality Settlement Cron Running");
            await penalitySettlementCron();
        })
        job.start();
    },
    recoverDriverAvailability: async () => {
        console.log("🔧 Driver availability recovery cron: Every 5 minutes");
        let job = cron.schedule("*/5 * * * *", async () => {
            await recoverDriverAvailability();
        });
        job.start();
    },
    calculateSurge: async () => {
        console.log("🔥 Surge heatmap calculation cron: Every 5 minutes");
        let job = cron.schedule("*/5 * * * *", async () => {
            await calculateSurgeHeatmap();
        });
        job.start();
    },
    cleanupSurgeData: async () => {
        console.log("🧹 Surge heatmap cleanup cron: Every hour");
        let job = cron.schedule("0 * * * *", async () => {
            await cleanupOldSurgeData();
        });
        job.start();
    }
}
module.exports = crons;