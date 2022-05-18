const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const NoteSchema = new Schema({
  title: { type: String },
  creator: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  note: { type: String, required: true },
  forTransaction: {
    type: mongoose.Types.ObjectId,
    ref: "Transaction",
    default: null,
  },
});

const NoteModel = mongoose.model("Note", NoteSchema);

module.exports = NoteModel;
