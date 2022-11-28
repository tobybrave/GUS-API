const mongoose = require("mongoose");
const beautifyUnique = require("mongoose-beautiful-unique-validation");

const BlockedContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
    unique: "phone already exist",
  },
  removedAt: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    required: true,
  },
});

BlockedContactSchema.plugin(beautifyUnique);

/* eslint-disable */
BlockedContactSchema.set("toJSON", {
  transform: (document, obj) => {
    obj.id = obj._id.toString();
    obj.removedAt = obj.removedAt.toDateString();

    delete obj._id;
    delete obj.__v;
  },
});

module.exports = mongoose.model("BlockedContact", BlockedContactSchema);
