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
const cron = require("node-cron")
const redisClient = require("./utils/redisClient");
//const twilioClient = require("./utils/twilioClient");
const genVerifyCode = require("./utils/genVerifyCode");
const logger = require("./utils/logger");
const data = require("./models/seed.json");
const Contact = require("./models/contact");
const Vcard = require("./models/vcard");
const vcardUtils = require("./utils/vcard")

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const formattedDate = (moment) => {
    const pad = (n) => n >=10 ? n : "0"+n 
    
    const date = moment || new Date()
    const day = date.getDay()
    const month = date.getMonth()
    const year = date.getFullYear()
    
    return `${year}-${pad(month + 1)}-${pad(day)}`
}

cron.schedule("*/10 * * * *", async () => {
	logger.info("running cron job")

    const compiledDate = formattedDate()
    const filename = `${compiledDate}.vcf`;
    
	const dbContacts = await Contact.find({})
	
	await vcardUtils.createVCF(filename, dbContacts)
	await vcardUtils.saveVCF(filename)
})

app.get("/ping", (request, response) => {
  // Vcard.find({}).then(logger.info).catch(logger.error)
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
  Contact.deleteMany({}).then(()=> logger.info("contacts db cleared"))
  Vcard.deleteMany({})
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

//  twilioClient.messages
//    .create({
//      from: process.env.TWILIO_PHONE_NO,
//      to: `${user.phone}`,
//      body: `Hello ${user.name}! Your WassapViews verification code is: ${verificationCode}`,
//    })
//    .then((message) => logger.info(message.sid))
//    .catch((err) => logger.error(err));
//
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

// get all vcards
// TODO: pagination, sort and order by date in desc order
app.get("/api/vcards", async (request, response) => {
  const vcards = await Vcard.find({});
  if (vcards.length){
      
      return response.status(200).json({
          vcards,
          message: "vcards retrieved"
      })
  }

  response.status(200).json({
      message: "no vcards yet"
  });
});

// get single vcard 
// TODO: verify password, change method to correspond
app.post("/api/vcards/:vcardId", async (request, response) => {
    const { vcardId } = request.params
    const { password } = request.body
    
    const vcard = await Vcard.findById(vcardId)
    if (!vcard) {
        return response.status(404).json({
            error: "vcard not found"
        })
    }
    
    const filename = `GUS ${formattedDate(vcard.date)}`
    
    response.set("Content-Type", `text/vcard; name="${filename}.vcf"`)
    response.set("Content-Disposition", `inline; filename="${filename}.vcf"`)
    
    response.status(200).send(vcard.vcf.toString())
})

// TODO: protect route
app.delete("/api/contacts/:phone", async (request, response) => {
    const { phone } = request.params

    const contact = await Contact.findOneAndRemove({phone})
    if (!contact) {
        return response.status(404).json({
            error: "contact not found"
        })
    }

    // find contacts by date
    const compiledDate = contact.joined
    const compiledDay = compiledDate.getDay()
    const compiledMonth = compiledDate.getMonth()
    const compiledYear = compiledDate.getFullYear()

    const dayRange = {
        $gte: new Date(compiledYear, compiledMonth, compiledDay),
        $lt: new Date(compiledYear, compiledMonth, compiledDay+1)
    }
    
    // remove vcard for affected date
    const vcard = await Vcard.findOneAndRemove({date: dayRange})
    
    // recompile contact
    const contactsCompiledOnDate = await Contact.find({joined: dayRange})
    logger.info("contacts compiled on affected date", formattedDate(compiledDate))
    logger.info("==== RECOMPILING VCARD ====")
    const filename = `${formattedDate(compiledDate)}.vcf`
    
    await vcardUtils.createVCF(filename, contactsCompiledOnDate)
    await vcardUtils.saveVCF(filename)
    
    response.status(204).json({
        message: "contact removed"
    })
})

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
