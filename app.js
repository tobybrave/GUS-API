require("express-async-errors");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");

const invalidEndpoint = require("./errors/invalidEndpoint");
const errorHandler = require("./errors/errorHandler");
const v1Routers = require("./routers");
const cronjob = require("./utils/cronjob");

const app = express();
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("build"));

cronjob();

app.use("/api/v1", v1Routers);
app.get("/*", (request, response) => {
  response.sendFile(path.resolve(__dirname, "build", "index.html"));
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

app.use(invalidEndpoint);
app.use(errorHandler);
app.disable("x-powered-by");

module.exports = app;
