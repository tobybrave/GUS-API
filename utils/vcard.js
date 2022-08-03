const VCardJS = require("vcards-js");
const fs = require("fs");
const logger = require("./logger");
const Vcard = require("../models/vcard");

const v = new VCardJS();
const adminContact = [
    {
        name: "MofeJesu Paul",
        phone: "08030000000",
        note: "Hey there! I'm Mofejesu the GUS 🍧 admin. Contact for help"
    }
    ]

const createVCF = (fName, contacts) => {
    logger.info("==== CREATING VCARD ====");
    
    contacts.forEach((contact) => {
      v.firstName = contact.name;
      v.workPhone = contact.phone;
      v.organization = "growursocials";
      v.nameSuffix = "GUS 🍧";
      v.note = contact.note || "This contact is from growursocials";

      const contactVCF = v.getFormattedString();
      
      fs.appendFile(`./${fName}`, contactVCF, (err) => {
        if (err) throw new Error(err);
      });
    });
};

const saveVCF = (fName) => {
    logger.info("==== SAVING VCARD =====")
    const compiledAt = fName.split(".")[0]
    // attach admin
    logger.info("==== ATTACHIMG ADMIN ====")
    createVCF(fName, adminContact)
    
	fs.readFile(`./${fName}`, (err, content) => {
		if (err) throw new Error(err)
		
		const vcard = new Vcard({
			date: compiledAt,
			vcf: content
		})
		vcard.save().then(result => logger.info(result)).catch(logger.error)
		
		fs.unlinkSync(`./${fName}`)
	})
}

module.exports = {
    createVCF,
    saveVCF
}

