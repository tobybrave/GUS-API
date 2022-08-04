const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
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
    enum: ["free", "package"],
    default: "free",
  },
  joined: {
    type: Date,
    default: new Date(),
  },
});

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
