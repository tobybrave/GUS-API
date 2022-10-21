const cron = require("node-cron");
const Contact = require("../models/Contact");
const logger = require("./logger");
const formatDate = require("./dateFormatter");
const vcardUtils = require("./vcard");

function cronjob() {
  cron.schedule("55 23 * * *", async () => {
    logger.info("running cron job");

    const day = new Date();
    const compiledDate = formatDate(day);
    const filename = `${compiledDate}.vcf`;

    const dbContacts = await Contact.find({
      joined: { $gt: new Date(day - 1 * 60 * 60 * 24 * 1000) },
    });

    if (dbContacts.length) {
      await vcardUtils.createVCF(filename, dbContacts);
      await vcardUtils.saveVCF(filename, dbContacts.length);
    }
    logger.info("cronjob done");
  });
}

module.exports = cronjob;
