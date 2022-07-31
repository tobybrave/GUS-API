const http = require("http");
const mongoose = require("mongoose");
const app = require("./app");
const logger = require("./utils/logger");

const dbUrl = process.env.MONGODB_URL;
const PORT = process.env.PORT || 4000;

mongoose
  .connect(dbUrl)
  .then(() => logger.info("db connected"))
  .catch((err) => logger.error(err.message));

const server = http.createServer(app);
server.listen(PORT, () => logger.info(`server running on port ${PORT}`));
