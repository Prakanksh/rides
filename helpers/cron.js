const cron = require("node-cron");
let {awsUrl} = require("../services/cron/cron");
let crons = {
    deleteAwsUrl: async () => {
        console.log("CRON is running...")
        let job2 = cron.schedule("0 0 * * *", awsUrl);
        job2.start();
    },
};
module.exports = crons;