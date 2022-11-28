/*
const Redis = require("ioredis");
const twilio = require("twilio");
const logger = require("./logger");

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1/6379";
const redisClient = new Redis(redisUrl);

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

const genVerifyCode = () => {
  const min = 100000;
  const max = 999999;

  return Math.floor(Math.random() * (max - min + 1));
};

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

*/
