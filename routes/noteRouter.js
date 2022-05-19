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

//GET ALL NOTES OF SPECIFIC USER
noteRouter.get("/notes/ofuser/:userId", authUser, async (req, res) => {
  const { userId } = req.params;

  //CHECKING IF AUTHUSER IS THE SAME AS USERID IN PARAMS
  if (req.user._id !== userId)
    return res.status(400).json({ message: "Dostęp zabroniony" });

  try {
    const notes = await NoteModel.find({
      creator: req.user._id,
    }).populate("forTransaction");
    res.status(200).json(notes);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

//EDIT NOTE
noteRouter.patch("/notes/:noteId", authUser, async (req, res) => {
  const { noteId } = req.params;

  try {
    const noteFromDB = await NoteModel.findById(noteId);
    if (!noteFromDB)
      return res.status(404).json({ message: "Nie znaleziono notatki." });

    //Checking for sure if auth user is also creator of this note
    if (noteFromDB.creator.toString() !== req.user._id.toString())
      return res.status(400).json({ message: "Dostęp zabroniony." });

    const editedNote = await NoteModel.findOneAndUpdate(
      { _id: noteFromDB._id },
      {
        ...noteFromDB,
        note: req.body.note,
      },
      { new: true }
    );

    res.status(200).json(editedNote);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

//GET NOTE BY ID
noteRouter.get("/notes/:noteId", authUser, async (req, res) => {
  const { noteId } = req.params;

  try {
    const note = await NoteModel.findById(noteId);
    //Checking if creator of this note is auth user also
    if (note.creator.toString() !== req.user._id.toString())
      return res.status(400).json({ message: "Dostęp zabroniony." });

    res.status(200).json(note);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = noteRouter;
