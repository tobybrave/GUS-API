require("express-async-errors");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
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

app.use(invalidEndpoint);
app.use(errorHandler);
app.disable("x-powered-by");

module.exports = app;
