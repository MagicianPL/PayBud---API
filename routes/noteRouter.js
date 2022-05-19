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
        ...noteFromDB.toObject(),
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

//DELETE NOTE
noteRouter.delete("/notes/:noteId", authUser, async (req, res) => {
  const { noteId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const noteFromDB = await NoteModel.findById(noteId);
    const transactionForThisNote = await TransactionModel.findById(
      noteFromDB.forTransaction
    ).populate("notes");

    if (!noteFromDB)
      return res.status(404).json({ message: "Nie znaleziono notatki." });

    //Checking if auth user is also creator of this note
    if (noteFromDB.creator.toString() !== req.user._id.toString())
      return res.status(400).json({ message: "Dostęp zabroniony." });

    //Deleting note
    const deletedNote = await NoteModel.findOneAndDelete(
      { _id: noteFromDB._id },
      { session }
    );
    //If note has transaction connected - delete this note from notes array on this transaction
    if (transactionForThisNote) {
      const arrayWithoutDeletedNote = transactionForThisNote.notes.filter(
        (note) => note._id.toString() !== noteId.toString()
      );

      const updatedTransaction = await TransactionModel.findOneAndUpdate(
        { _id: transactionForThisNote._id },
        {
          notes: arrayWithoutDeletedNote,
        },
        { new: true, session }
      );
    }

    await session.commitTransaction();
    session.endSession();
    res.status(200).json(deletedNote);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: err.message });
  }
});

module.exports = noteRouter;
