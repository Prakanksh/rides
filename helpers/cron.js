const cron = require("node-cron");
const { awsUrl } = require("../services/cron/cron");
const processCashSettlements = require("../services/cron/cashSettlement.cron");
const processWalletSettlements = require("../services/cron/walletSettlement.cron");
const { activateScheduledRides } = require("../services/cron/scheduledRides.cron");
const { cashSettlementSchedule, walletSettlementSchedule } = require("../configs/cron.config");

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
    scheduledRidesActivation: async () => {
        console.log("📅 Scheduled rides activation cron: Every 1 minute");
        let job = cron.schedule("* * * * *", async () => {
            await activateScheduledRides();
        });
        job.start();
    },
};
module.exports = crons;