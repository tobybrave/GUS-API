const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Contact = require("../models/Contact");
const Vcard = require("../models/Vcard");
const BlockedContact = require("../models/BlockedContact");
const vcardUtils = require("../utils/vcard");
const formatDate = require("../utils/dateFormatter");
const logger = require("../utils/logger");

const pong = (req, res) => {
  res.send("pong");
};

async function healthCheck(req, res) {
  const contacts = await Contact.find();

  res.status(200).json(contacts);
}

async function register(req, res) {
  const { name, phone, password } = req.body;

  const blacklisted = await BlockedContact.findOne({ phone });
  if (blacklisted) {
    return res.status(403).json({
      success: false,
      message: "The contact you're trying to register has been blacklisted",
      error: "phone blacklisted",
    });
  }

  const contactInDb = await Contact.findOne({ phone });
  if (contactInDb) {
    return res.status(200).json({
      success: true,
      message: "contact already exist",
      user: contactInDb,
    });
  }

  const saltRound = 10;
  const hashPassword = await bcrypt.hash(password, saltRound);

  const payload = {
    name,
    phone,
  };
  const token = await jwt.sign(payload, process.env.JWT_SECRET_KEY, { issuer: "growursocials.com" });

  const contact = new Contact({
    name,
    phone,
    token,
    password: hashPassword,
  });

  const savedContact = await contact.save();

  return res.status(201).json({
    success: true,
    messagee: "Account successfully created",
    user: savedContact,
  });
}

async function getAllVcards(req, res) {
  const page = Number(req.query.page) || 1;
  const limiter = 10;
  // const offset = (page - 1) * limiter;

  const vcards = await Vcard.find().select("date").sort({ date: "desc" });
  // .limit(limiter).skip(offset);
  const count = await Vcard.count();
  return res.status(200).json({
    vcards,
    totalPages: Math.ceil(count / limiter),
    currentPage: page,
    message: "vcards retrieved",
  });
}

async function getVcard(req, res) {
  const { id } = req.params;
  const { password } = req.body;

  const contact = await Contact.findOne({ phone: req.user.phone });
  const validPassword = await bcrypt.compare(password, contact.password);

  if (!validPassword) {
    return res.status(400).json({
      success: false,
      error: "incorrect password",
    });
  }

  const vcard = await Vcard.findById(id);
  if (!vcard) {
    return res.status(404).json({
      success: false,
      message: `The vcard with ID ${id} does not exist`,
      error: "vcard not found",
    });
  }

  if (contact.vcards.indexOf(id) === -1) {
    contact.vcards = contact.vcards.concat(id);
    contact.downloads = vcard.totalContacts?.length || 20;
    await contact.save();
  }

  const filename = `GUS_${formatDate(vcard.date)}`;

  res.set("Content-Type", `text/vcard; name="${filename}.vcf"`);
  res.set("Content-Disposition", `filename="${filename}.vcf"`);

  return res.status(200).send(vcard.vcf.toString());
}

async function blacklistedContacts(req, res) {
  const blacklisted = await BlockedContact.find().sort("desc").limit(5);
  return res.status(200).json({
    success: true,
    message: "Blacklisted contacts retrieved",
    contacts: blacklisted,
  });
}

async function blacklistContact(req, res) {
  const { phone } = req.params;
  const { reason } = req.query;

  const adminContact = await Contact.findOne({ phone: req.user?.phone });
  if (adminContact?.phone !== process.env.ADMIN_PHONE) {
    return res.status(403).end();
  }

  const contact = await Contact.findOneAndRemove({ phone });
  if (!contact) {
    return res.status(404).json({
      success: false,
      message: `The contact with the phone ${phone} does not exist`,
      error: "contact not found",
    });
  }

  // find contacts by date
  const compiledDate = contact.joined;
  const compiledDay = compiledDate.getDate();
  const compiledMonth = compiledDate.getMonth();
  const compiledYear = compiledDate.getFullYear();

  const dayRange = {
    $gte: new Date(compiledYear, compiledMonth, compiledDay),
    $lt: new Date(compiledYear, compiledMonth, compiledDay + 1),
  };

  // remove vcard for affected date
  await Vcard.findOneAndRemove({ date: dayRange });
  // recompile contact
  const contactsCompiledOnDate = await Contact.find({ joined: dayRange });

  logger.info("contacts compiled on affected date", formatDate(compiledDate));
  if (contactsCompiledOnDate.length) {
    logger.info("==== RECOMPILING VCARD ====");
    const filename = `${formatDate(compiledDate)}.vcf`;
    await vcardUtils.createVCF(filename, contactsCompiledOnDate);
    await vcardUtils.saveVCF(filename, contactsCompiledOnDate.length);
  }

  const reportedContact = new BlockedContact({
    name: contact.name,
    phone: contact.phone,
    reason: reason.replace("+", " "),
  });
  await reportedContact.save();

  return res.status(204).json({
    success: true,
    message: "Contact blacklisted",
  });
}

module.exports = { pong, healthCheck, register, getAllVcards, getVcard, blacklistedContacts, blacklistContact };
