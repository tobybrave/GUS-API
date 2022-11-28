const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    contacts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Batch", batchSchema);
