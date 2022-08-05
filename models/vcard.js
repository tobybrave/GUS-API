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

vcardSchema.set("toJSON", {
    transform: (doc, obj) => {
        obj.id = obj._id.toString()
        
        delete obj._id
        delete obj.__v
        delete obj.vcf
    }
})

module.exports = mongoose.model("Vcard", vcardSchema);
