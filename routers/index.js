const router = require("express").Router();
const { regValidation, loginValidation } = require("../validations/requestValidation");
const tokenValidation = require("../validations/tokenValidation");
const {
  pong,
  healthCheck,
  register,
  getVcard,
  blacklistContact,
  blacklistedContacts,
  getVcardsPerBatch,
  login,
} = require("../controllers");

router.get("/ping", pong);
router.get("/health-check", healthCheck);

router.post("/register", regValidation, register);
router.post("/login", loginValidation, login);
router.get("/vcards", tokenValidation, getVcardsPerBatch);
router.post("/vcards/:id", tokenValidation, getVcard);
router.get("/contacts/blacklisted", blacklistedContacts);
router.delete("/contacts/:phone", tokenValidation, blacklistContact);

module.exports = router;
