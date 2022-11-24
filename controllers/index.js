const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const moment = require("moment");
const Contact = require("../models/Contact");
const Vcard = require("../models/Vcard");
const BlockedContact = require("../models/BlockedContact");
const vcardUtils = require("../utils/vcard");
const formatDate = require("../utils/dateFormatter");
const logger = require("../utils/logger");
const Batch = require("../models/Batch");

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
    return res.status(400).json({
      success: false,
      message: "The phone number has been taken",
      error: "contact already exist",
    });
  }

  const saltRound = 10;
  const hashPassword = await bcrypt.hash(password, saltRound);

  const contact = new Contact({
    name,
    phone,
    password: hashPassword,
  });

  /* eslint-disable no-underscore-dangle */
  const batches = await Batch.find();
  const lastBatchIdx = batches.length - 1;
  if (!batches.length || batches[lastBatchIdx].contacts.length === 200) {
    const batch = new Batch();
    contact.batch = batch._id;
    batch.contacts = batch.contacts.concat(contact._id);

    await batch.save();
  } else {
    const lastBatch = batches[lastBatchIdx];
    contact.batch = lastBatch._id;
    lastBatch.contacts = lastBatch.contacts.concat(contact._id);

    await lastBatch.save();
  }

  const payload = { name, phone };
  const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { issuer: "growursocials.com", expiresIn: "2d" });

  const savedContact = await contact.save();
  savedContact.token = token;

  return res.status(201).json({
    success: true,
    message: "Account successfully created",
    user: { ...savedContact.toJSON(), token },
  });
}

async function login(req, res) {
  const { phone, password } = req.body;
  const user = await Contact.findOne({ phone });
  const verifyPassword = user ? await bcrypt.compare(password, user.password) : null;

  if (!user || !verifyPassword) {
    return res.status(400).json({
      success: false,
      message: "Incorrect phone or password",
      error: "wrong password or phone",
    });
  }

  const payload = {
    phone: user.phone,
    name: user.name,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { issuer: "growursocials.com", expiresIn: "7d" });
  return res.status(200).json({
    success: true,
    message: "Login successful",
    user: {
      ...payload,
      token,
    },
  });
}

async function getVcardsPerBatch(req, res) {
  const contact = await Contact.findOne({ phone: req.user.phone }).populate("batch");

  const batchStartDate = moment(contact.batch.createdAt).utc().startOf("day").toDate();
  const batchEndDate = moment(contact.batch.updatedAt).utc().endOf("day").toDate();

  const page = Number(req.query.page) || 1;
  const limiter = 10;
  // const offset = (page - 1) * limiter;

  const vcards = await Vcard.find({
    createdAt: {
      $gte: batchStartDate,
      $lte: batchEndDate,
    },
  })
    .select("-vcf")
    .sort({ createdAt: "desc" });
  // .limit(limiter).skip(offset);

  const count = await vcards.length;
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
  const validPassword = await bcrypt.compare(password.toString(), contact.password);

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
    await contact.save();
  }

  const filename = `GUS_${formatDate(vcard.createdAt)}`;

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

module.exports = { register, login, getVcardsPerBatch, getVcard, blacklistedContacts, blacklistContact };
