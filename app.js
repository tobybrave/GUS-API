// TODOS
//     === NEEDS ===
//     uuid for password generation
//     whatsapp api for verification process
//      session during the verification process ?
//     === WANTS ===
//     joi for verification

const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");
const redisClient = require("./utils/redisClient");
const twilioClient = require("./utils/twilioClient");
const genVerifyCode = require("./utils/genVerifyCode");
const logger = require("./utils/logger");
const data = require("./models/seed.json");
const Contact = require("./models/contact");
const Vcard = require("./models/vcard");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/ping", (request, response) => {
  Contact.find({})
    .then((result) => response.json(result))
    .catch((err) => response.status(500).json(err));
  // response.status(200).json({ data: "pong" });
});

app.get("/seed", (request, response) => {
  Contact.insertMany(data.verified)
    .then((result) => response.status(202).json(result))
    .catch((err) => response.status(500).json(err));
});
app.get("/unseed", (request, response) => {
  Contact.deleteMany({})
    .then(() => response.status(200).json({ message: "db cleared" }))
    .catch((err) => response.status(500).json(err));
});

// new user registration
app.post("/api/auth", (request, response) => {
  // TODO: check if number is already in db, also check redis-server
  const { name, phone } = request.body;

  if (!(name && phone)) {
    return response.status(400).json({
      error: "all fields are required",
    });
  }
  const user = {
    name,
    phone,
    // // move to verify
    // package: "free",
    // joined: new Date(),
    // isVerified: false,
  };
  // logger.info(user);
  const verificationCode = genVerifyCode();
  logger.info(verificationCode);

  redisClient
    .set(user.phone, `${verificationCode}`, "EX", 3600)
    .then((res) => logger.info(res))
    .catch((err) => logger.error(err));

  twilioClient.messages
    .create({
      from: process.env.TWILIO_PHONE_NO,
      to: `${user.phone}`,
      body: `Hello ${user.name}! Your WassapViews verification code is: ${verificationCode}`,
    })
    .then((message) => logger.info(message.sid))
    .catch((err) => logger.error(err));

  return response.status(202).json({
    user,
    message: "Account creation is process. Kindly check your whatsapp for your verification code",
  });
});

// verify user before adding to database
app.post("/api/auth/verify", (request, response) => {
  const { name, phone, verificationCode } = request.body;
  // TODO: verify if code sent to whatsapp is the same and issue a token, a pass, and add to db

  redisClient
    .get(phone)
    .then((result) => {
      if (result === verificationCode) {
        redisClient.del(phone).then(logger.info).catch(logger.error);

        const password = nanoid();
        logger.info("passsword generated is:", password);
        const contact = new Contact({
          name,
          phone,
          password,
        });

        contact
          .save()
          .then((resp) => response.status(201).json({ resp, message: "Account created" }))
          .catch((err) => response.status(500).json({ error: err.message }));
      }
      return response.status(400).json({
        error: "The phone number and sms code does not match",
      });
    })
    .catch(logger.error);
});

// get all vcard
app.get("/api/downloads", async (request, response) => {
  const vcards = await Vcard.find({});
  const v = vcards.map((card) => ({ ...card, vcf: card.vcf.toString() }));
  logger.info(v);
  response.status(200).json(v);
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
      error: error.message,
    });
  }
  return next(error);
};
app.use(errorHandler);

app.disable("x-powered-by");
module.exports = app;
