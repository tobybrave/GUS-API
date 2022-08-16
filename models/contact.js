const mongoose = require("mongoose");
const beautifyUnique = require("mongoose-beautiful-unique-validation");

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
    unique: "phone already exist",
  },
  password: {
    type: String,
    required: true,
  },
  token: {
    type: String,
  },
  package: {
    type: String,
    enum: ["free", "premium"],
    default: "free",
  },
  joined: {
    type: Date,
    default: new Date(),
  },
  downloads: {
    type: Number,
    default: 0,
  },
  vcards: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vcard",
    },
  ],
});

contactSchema.plugin(beautifyUnique);

/* eslint-disable */
contactSchema.set("toJSON", {
  transform: (document, obj) => {
    obj.id = obj._id.toString();
    obj.joined = obj.joined.toDateString();

    delete obj._id;
    delete obj.__v;
    delete obj.password;
  },
});

module.exports = mongoose.model("Contact", contactSchema);
