require("express-async-errors");
const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");
const cron = require("node-cron");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const Joi = require("joi");

const redisClient = require("./utils/redisClient");
const twilioClient = require("./utils/twilioClient");
const genVerifyCode = require("./utils/genVerifyCode");
const logger = require("./utils/logger");
const data = require("./models/seed.json");
const Contact = require("./models/contact");
const Vcard = require("./models/vcard");
const vcardUtils = require("./utils/vcard");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("build"));

const formattedDate = (moment) => {
  const pad = (n) => (n >= 10 ? n : `0${n}`);

  const date = moment || new Date();
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  return `${year}-${pad(month + 1)}-${pad(day)}`;
};
const schema = Joi.object({
  name: Joi.string()
    .regex(/^[a-z ,.'-]+$/i)
    .min(2)
    .max(40)
    .required(),
  phone: Joi.string()
    .regex(/^\+(?:[0-9] ?){6,14}[0-9]$/)
    .required(),
  package: Joi.string().valid("free", "premium").lowercase(),
});

function validateToken(req, res, next) {
  const auth = req.get("Authorization");
  const authType = auth?.startsWith("Bearer ");
  if (!auth || !authType) {
    return res.status(401).json({
      error: "missing or invalid token",
    });
  }

  const token = auth.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decodedToken) => {
    if (err) next(err);
    req.user = decodedToken;
  });
  return next();
}
function validateReqData(req, res, next) {
  const value = schema.validate(req.body);
  if (value.error) {
    next(value.error);
  }
  return next();
}

cron.schedule("*/20 * * * *", async () => {
  logger.info("running cron job");

  const compiledDate = formattedDate();
  const filename = `${compiledDate}.vcf`;

  const dbContacts = await Contact.find();

  if (dbContacts.length) {
    await vcardUtils.createVCF(filename, dbContacts);
    await vcardUtils.saveVCF(filename, dbContacts.length);
  }
});

app.get("/ping", (request, response) => {
  // Vcard.find({}).then(logger.info).catch(logger.error)
  Contact.find({})
    .then((result) => response.json(result))
    .catch((err) => response.status(500).json(err));
  // response.status(200).json({ data: "pong" });
});

app.post("/seed", async (request, response) => {
  const contacts = await Contact.insertMany(data.verified);

  response.status(200).json(contacts);
});
app.get("/unseed", (request, response) => {
  Vcard.deleteMany({}).then(() => logger.info("contacts db cleared"));
  // redisClient.keys("*").then(results => results.forEach(key => redisClient.del(key))).catch(logger.error)
  Contact.deleteMany({})
    .then(() => response.status(200).json({ message: "db cleared" }))
    .catch((err) => response.status(500).json(err));
});

// new user registration
app.post("/api/auth", validateReqData, async (request, response) => {
  const { name, phone } = request.body;

  const contactInRedis = await redisClient.get(phone);
  if (contactInRedis) {
    return response.status(200).json({
      message: "a verification code was sent to your whatsapp",
    });
  }

  const contactInDb = await Contact.findOne({ phone });
  if (contactInDb) {
    return response.status(200).json({
      user: contactInDb,
      message: "contact already exist",
    });
  }

  const user = {
    name,
    phone,
  };
  // logger.info(user);
  const verificationCode = genVerifyCode();
  logger.info("generated code", verificationCode);

  await redisClient.set(user.phone, `${verificationCode}`, "EX", 3600);
  twilioClient.messages
    .create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_PHONE_NO}`,
      to: `whatsapp:${user.phone}`,
      body: `Hello ${user.name}! Your GUS verification code is: ${verificationCode}`,
    })
    .then((message) => logger.info(message.sid))
    .catch((err) => logger.error(err));

  return response.status(202).json({
    user,
    message: "Account creation in progress. Kindly check your whatsapp for your verification code",
  });
});

// verify user before adding to database
app.post("/api/auth/verify", (request, response) => {
  const { name, phone, verificationCode } = request.body;
  // TODO: verify if code sent to whatsapp is the same and issue a token, a pass, and add to db
  redisClient
    .get(phone)
    .then(async (result) => {
      if (Number(result) === Number(verificationCode)) {
        // remove logger
        redisClient.del(phone).then(logger.info).catch(logger.error);

        const password = nanoid();
        const saltRound = 10;
        const hashPassword = await bcrypt.hash(password, saltRound);

        const payload = {
          name,
          phone,
        };
        return jwt.sign(payload, process.env.JWT_SECRET_KEY, { issuer: "growursocials.com" }, (err, token) => {
          if (err) {
            // throw new Error(err);
            return response.status(500).json({
              error: err,
            });
          }

          const contact = new Contact({
            name,
            phone,
            token,
            password: hashPassword,
          });

          return contact
            .save()
            .then((resp) => {
              const user = { ...resp.toJSON(), password };
              return response.status(201).json({
                user,
                message: "Account created",
              });
            })
            .catch((error) => response.status(500).json({ error: error.message }));
        });
      }

      return response.status(400).json({
        error: "The phone number and sms code does not match",
      });
    })
    .catch(logger.error);
});

// get all vcards
app.get("/api/vcards", async (request, response) => {
  const page = Number(request.query.page) || 1;
  const limiter = 10;
  const offset = (page - 1) * limiter;

  const vcards = await Vcard.find().select("date").sort({ date: "desc" }).limit(limiter).skip(offset);
  const count = await Vcard.count();
  return response.status(200).json({
    vcards,
    totalPages: Math.ceil(count / limiter),
    currentPage: page,
    message: "vcards retrieved",
  });
});

// get single vcard
// TODO: verify password, change method to correspond
app.post("/api/vcards/:vcardId", validateToken, async (request, response) => {
  const { vcardId } = request.params;
  const { password } = request.body;

  const contact = await Contact.findOne({ phone: request.user.phone });
  const validPassword = await bcrypt.compare(password, contact.password);
  if (!validPassword) {
    return response.status(400).json({
      error: "invalid user details",
    });
  }

  const vcard = await Vcard.findById(vcardId);
  if (!vcard) {
    return response.status(404).json({
      error: "vcard not found",
    });
  }

  if (contact.vcards.indexOf(vcardId) === -1) {
    contact.vcards = contact.vcards.concat(vcardId);
    contact.downloads = vcard.totalContacts?.length || 20;
    await contact.save();
  }

  const filename = `GUS ${formattedDate(vcard.date)}`;

  response.set("Content-Type", `text/vcard; name="${filename}.vcf"`);
  response.set("Content-Disposition", `inline; filename="${filename}.vcf"`);

  return response.status(200).send(vcard.vcf.toString());
});

// for testing
app.get("/api/vcards/:id", async (request, response) => {
  const vcard = await Vcard.findById(request.params.id);
  if (!vcard) {
    return response.status(404).json({
      error: "vcard not found",
    });
  }

  response.set("Content-Type", `text/vcard; name="${new Date().toDateString()}.vcf"`);
  response.set("Content-Disposition", `inline; filename="${new Date().toDateString()}.vcf"`);

  return response.status(200).send(vcard.vcf.toString());
});

app.get("/api/payment/verify/:reference", async (request, response) => {
  const { reference } = request.params;
  logger.info("payment route");
  const result = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: process.env.PAYSTACK_SECRET_KEY },
  });
  logger.info(result.data);
  response.status(200).json({ message: "payment successful" });
});

// TODO: protect route
app.delete("/api/contacts/:phone", validateToken, async (request, response) => {
  const { phone } = request.params;

  const adminContact = await Contact.findOne({ phone: request.user.phone });
  if (adminContact.phone !== process.env.ADMIN_PHONE) {
    return response.status(403).end();
  }

  const contact = await Contact.findOneAndRemove({ phone });
  if (!contact) {
    return response.status(404).json({
      error: "contact not found",
    });
  }

  // find contacts by date
  const compiledDate = contact.joined;
  const compiledDay = compiledDate.getDay();
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

  logger.info("contacts compiled on affected date", formattedDate(compiledDate));
  if (contactsCompiledOnDate.length) {
    logger.info("==== RECOMPILING VCARD ====");
    const filename = `${formattedDate(compiledDate)}.vcf`;
    await vcardUtils.createVCF(filename, contactsCompiledOnDate);
    await vcardUtils.saveVCF(filename, contactsCompiledOnDate.length);
  }

  return response.status(204).json({
    message: "contact removed",
  });
});

const invalidEndpoint = (request, response) => {
  response.status(404).json({
    error: "unknown endpoint",
  });
};
app.use(invalidEndpoint);

const errorHandler = (error, request, response, next) => {
  logger.error(error);
  if (error.name === "ValidationError") {
    return response.status(400).json({
      error: error.message.split(":")[0].replace(/['"]/g, ""),
      errorMessage: "Invalid request data. Please review request and retry again",
    });
  }
  if (error.name === "CastError") {
    return response.status(400).json({
      error: "malformed id",
    });
  }
  if (error.name === "MongooseError") {
    return response.status(400).json({
      error: error.message,
    });
  }
  if (error.name === "JsonWebTokenError") {
    return response.status(401).json({
      error: error.message,
    });
  }
  return next(error);
};
app.use(errorHandler);

app.disable("x-powered-by");
module.exports = app;
