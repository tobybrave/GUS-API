const mongoose = require("mongoose");
const beautifyUnique = require("mongoose-beautiful-unique-validation");

const ContactSchema = new mongoose.Schema({
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
  package: {
    type: String,
    enum: ["free", "premium"],
    default: "free",
  },
  joined: {
    type: Date,
    default: Date.now,
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
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Batch",
  },
});

ContactSchema.plugin(beautifyUnique);

/* eslint-disable */
ContactSchema.set("toJSON", {
  transform: (document, obj) => {
    obj.id = obj._id.toString();
    obj.joined = obj.joined.toDateString();

    delete obj._id;
    delete obj.__v;
    delete obj.password;
  },
});

module.exports = mongoose.model("Contact", ContactSchema);
