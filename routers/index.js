const router = require("express").Router();
const requestValidation = require("../validations/requestValidation");
const tokenValidation = require("../validations/tokenValidation");
const {
  register,
  getVcard,
  blacklistContact,
  blacklistedContacts,
  getVcardsPerBatch,
} = require("../controllers");

router.post("/register", requestValidation, register);
router.get("/vcards", tokenValidation, getVcardsPerBatch);
router.post("/vcards/:id", tokenValidation, getVcard);
router.get("/contacts/blacklisted", blacklistedContacts);
router.delete("/contacts/:phone", tokenValidation, blacklistContact);

module.exports = router;
