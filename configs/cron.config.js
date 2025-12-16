module.exports = {
  // Cash Payment Settlement Cron Schedule
  // Default: Every day at 2 AM (02:00)
  cashSettlementSchedule: process.env.CASH_SETTLEMENT_CRON_SCHEDULE || "0 2 * * *",
  // Wallet Payment Settlement Cron Schedule
  // Default: Every day at 3 AM (03:00)
  walletSettlementSchedule: process.env.WALLET_SETTLEMENT_CRON_SCHEDULE || "0 3 * * *"
};

