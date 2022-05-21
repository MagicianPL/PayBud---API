const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const TransactionsAmountSchema = new Schema({
  transactions: { type: Number, default: 26 },
});

const TransactionsAmountModel = mongoose.model(
  "TransactionsAmount",
  TransactionsAmountSchema
);

module.exports = TransactionsAmountModel;
