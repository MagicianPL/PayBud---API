const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  title: { type: String, required: true },
  amount: { type: String, default: "" },
  status: { type: String, required: true },
  creator: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  notes: { type: [], default: [] },
  isArchived: { type: Boolean, required: true, default: false },
});

const TransactionModel = mongoose.model("Transaction", TransactionSchema);

module.exports = TransactionModel;
