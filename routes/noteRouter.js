const express = require("express");
const mongoose = require("mongoose");

const NoteModel = require("../models/NoteModel");
const TransactionModel = require("../models/TransactionModel");
const authUser = require("../helpers/authUser");

const noteRouter = express.Router();

//CREATE NEW NOTE
noteRouter.post("/notes", authUser, async (req, res) => {
  const { title, note, forTransaction } = req.body;

  //SIMPLE VALIDATION
  if (!note) return res.status(400).json({ message: "Nieprawidłowe dane." });

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const newNote = new NoteModel({
      title,
      creator: req.user._id,
      note,
      forTransaction,
    });

    const createdNote = await newNote.save({ session });
    //UPDATING ARRAY OF NOTES ON TRANSACTION - IF NOTE HAS FORTRANSACTION PROPERTY
    if (forTransaction) {
      const transactionFromDB = await TransactionModel.findById({
        _id: forTransaction,
      });
      const editedTransaction = await TransactionModel.findOneAndUpdate(
        { _id: forTransaction },
        {
          notes: [createdNote._id, ...transactionFromDB.notes],
        },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();
    res.status(201).json(createdNote);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: err.message });
  }
});

//GET NOTES OF SPECIFIC TRANSACTION
noteRouter.get(
  "/notes/oftransaction/:transactionId",
  authUser,
  async (req, res) => {
    const { transactionId } = req.params;

    try {
      const notes = await NoteModel.find({
        creator: req.user._id,
        forTransaction: transactionId,
      }).populate("forTransaction");
      res.status(200).json(notes);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

module.exports = noteRouter;
