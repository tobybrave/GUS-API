const mongoose = require("mongoose");

const vcardSchema = new mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now,
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
