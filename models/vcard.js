const mongoose = require("mongoose");

const vcardSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: new Date(),
  },
  vcf: {
    type: Buffer,
    required: true,
  },
});

module.exports = mongoose.model("Vcard", vcardSchema);
