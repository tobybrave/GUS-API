const VCardJS = require("vcards-js");
const fs = require("fs");
const Contact = require("../models/contact");
const logger = require("./logger");
const Vcard = require("../models/vcard");

const v = new VCardJS();

const compiledAt = new Date().toDateString();
const filename = `./${compiledAt}.vcf`;

const createVCF = async (cb) => {
  try {
    cb(filename);
    const contacts = await Contact.find({});
    logger.info("got here");
    contacts.forEach(({ name, phone }) => {
      v.firstName = name;
      v.workPhone = phone;
      v.organization = "growursocials";
      v.nameSuffix = "GUS 🍧";
      v.note = "This contact is from growursocials";

      const contactVCF = v.getFormattedString();
      fs.writeFile(filename, contactVCF, { flag: "a+" }, (err) => {
        if (err) throw err;
      });
    });
  } catch (err) {
    logger.error(err);
  }
};

const attachAdmin = (file) => {
  v.firstName = "MofeJesu Paul";
  v.workPhone = "0000000";
  v.note = "growursocials admin. Contact for help";
  v.organization = "growursocials";
  v.nameSuffix = "GUS 🍧";

  const adminVCF = v.getFormattedString();
  fs.appendFile(file, adminVCF, (err) => {
    if (err) throw new Error(err);
  });
};

const saveVcfToDb = async () => {
  const vcard = new Vcard({
    date: new Date(compiledAt),
    vcf: fs.readFileSync(filename),
  });

  await vcard
    .save()
    .then((result) => logger.info(result))
    .catch(logger.error);
};

async function main() {
  Vcard.deleteMany().then(logger.info).catch(logger.error);
  await createVCF(attachAdmin);
  await saveVcfToDb();
  // clean up
}
main();
// Vcard.find({}).then(logger.info).catch(logger.error);
