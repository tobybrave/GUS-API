const VCardJS = require("vcards-js");
const fs = require("fs");
const logger = require("./logger");
const Vcard = require("../models/Vcard");
const Batch = require("../models/Batch");

const v = new VCardJS();
const adminContact = [
  {
    name: process.env.ADMIN_NAME,
    phone: process.env.ADMIN_PHONE,
    note: `Hey there! I'm ${process.env.ADMIN_NAME} the GUS🍧 admin. Contact for help`,
  },
];

const createVCF = (fName, contacts) => {
  logger.info("==== CREATING VCARD ====");

  contacts.forEach((contact) => {
    v.firstName = contact.name;
    v.workPhone = contact.phone;
    v.organization = "growursocials";
    v.nameSuffix = "GUS🍧";
    v.note = contact.note || "This contact is from growursocials";

    const contactVCF = v.getFormattedString();

    fs.appendFile(`./${fName}`, contactVCF, (err) => {
      if (err) throw new Error(err);
    });
  });
};

const saveVCF = async (fName, total) => {
  logger.info("==== SAVING VCARD =====");
  const compiledAt = fName.split(".")[0];

  // attach admin
  const batches = await Batch.find();
  const lastBatchIdx = batches.length - 1;
  const contactsInLastBatch = batches[lastBatchIdx].contacts.length;

  if (contactsInLastBatch >= 150 && contactsInLastBatch <= 180) {
    logger.info("==== ATTACHIMG ADMIN ====");
    createVCF(fName, adminContact);
  }

  fs.readFile(`./${fName}`, (err, content) => {
    if (err) throw new Error(err);

    const vcard = new Vcard({
      date: compiledAt,
      totalContacts: total,
      vcf: content,
    });
    vcard.save().catch(logger.error);

    fs.unlinkSync(`./${fName}`);
  });
};

module.exports = {
  createVCF,
  saveVCF,
};
