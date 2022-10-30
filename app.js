require("express-async-errors");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");

const logger = require("./utils/logger");
const data = require("./models/seed.json");
const Contact = require("./models/Contact");
const Vcard = require("./models/Vcard");
const invalidEndpoint = require("./errors/invalidEndpoint");
const errorHandler = require("./errors/errorHandler");

const v1Routers = require("./routers");
const cronjob = require("./utils/cronjob");

const app = express();
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(express.static("build"));

cronjob();

app.use("/api/v1", v1Routers);

// for testing
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

  if (result.data.data.status === "success") {
    fs.appendFileSync("./premium.txt", JSON.stringify(result.data.data.metadata));
    return response.status(200).json({ message: "transaction successful" });
  }
  return response.status(402).json({ message: "transaction not successful" });
});

// app.get("/*", (request, response) => {
//   response.sendFile(path.resolve(__dirname, "build", "index.html"));
// });

app.use(invalidEndpoint);
app.use(errorHandler);
app.disable("x-powered-by");

module.exports = app;
