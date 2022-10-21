const mongoose = require("mongoose");

const vcardSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: new Date(),
  },
  totalContacts: {
    type: Number,
  },
  vcf: {
    type: Buffer,
    required: true,
  },
});

/* eslint-disable */
vcardSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, obj) => {
    delete obj._id;
  },
});

module.exports = mongoose.model("Vcard", vcardSchema);
