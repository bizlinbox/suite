const { Queue } = require('bullmq');
const config = require('../config');

const connection = {
  url: config.redisUrl,
};

const messageQueue = new Queue('messageQueue', { connection });
const analyticsQueue = new Queue('analyticsQueue', { connection });
const campaignQueue = new Queue('campaignQueue', { connection });

module.exports = {
  messageQueue,
  analyticsQueue,
  campaignQueue,
};
