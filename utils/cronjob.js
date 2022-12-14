const cron = require("node-cron");
const moment = require("moment");
const Contact = require("../models/Contact");
const logger = require("./logger");
const formatDate = require("./dateFormatter");
const vcardUtils = require("./vcard");

function cronjob() {
  cron.schedule("55 23 * * *", async () => {
    logger.info("running cron job");

    const day = new Date();
    const today = moment().startOf("day");
    const compiledDate = formatDate(day);
    const filename = `${compiledDate}.vcf`;

    const dbContacts = await Contact.find({
      joined: {
        $gte: today.toDate(),
        $lte: moment(today).endOf("day").toDate(),
      },
    });

    if (dbContacts.length) {
      await vcardUtils.createVCF(filename, dbContacts);
      await vcardUtils.saveVCF(filename, dbContacts.length);
    }
    logger.info("cronjob done");
  });
}

module.exports = cronjob;
