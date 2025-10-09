const cron = require('node-cron');
const sportsDataService = require('../services/sportsDataService');
// Update projections every 6 hours during season
cron.schedule('0 */6 * * *', async () => {
  try {
    await sportsDataService.fetchProjections();
  } catch (error) {
});
// Manual update function
async function manualUpdate() {
  try {
    await sportsDataService.fetchProjections();
  } catch (error) {
if (require.main === module) {
  manualUpdate();
module.exports = { manualUpdate };