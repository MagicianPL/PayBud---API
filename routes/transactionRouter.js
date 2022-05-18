const express = require("express");
const mongoose = require("mongoose");

const TransactionModel = require("../models/TransactionModel");
const authUser = require("../helpers/authUser");
const UserModel = require("../models/UserModel");

const transactionRouter = express.Router();

//CREATE NEW
transactionRouter.post("/transactions", authUser, async (req, res) => {
  const { title, amount, status } = req.body;

  //Validation
  if (!title || !status)
    return res.status(400).json({ message: "Nieprawidłowe dane" });

  try {
    //START SESSION
    const session = await mongoose.startSession();
    session.startTransaction();

    const createdTransaction = new TransactionModel(
      {
        title,
        amount: amount || null,
        status,
        creator: req.user._id,
      },
      { session }
    );
    await createdTransaction.save({ session });

    //Saving this transaction to User
    const foundedUser = await UserModel.findById({
      _id: req.user._id,
    });

    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: foundedUser._id },
      { transactions: [createdTransaction, ...foundedUser.transactions] },
      { session, new: true }
    );

    await session.commitTransaction();
    res.status(201).json(createdTransaction);
    session.endSession();
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
    session.endSession();
  }
});

//GET ALL TRANSACTIONS OF SPECIFIC USER
transactionRouter.get(
  "/transactions/user/:userId",
  authUser,
  async (req, res) => {
    const { userId } = req.params;

    if (userId !== req.user._id)
      return res.status(400).json({ message: "Dostęp zabroniony." });

    try {
      const transactions = await TransactionModel.find({ creator: userId });
      res.status(200).json(transactions);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

transactionRouter.patch(
  "/transactions/:transactionId",
  authUser,
  async (req, res) => {
    const { transactionId } = req.params;
    const transactionForExchange = req.body;

    try {
      const transactionFromDB = await TransactionModel.findById({
        _id: transactionId,
      });

      //Checking creator of this transaction
      if (transactionFromDB.creator.toString() !== req.user._id) {
        return res.status(400).json({ message: "Dostęp zabroniony." });
      }

      const editedTransaction = await TransactionModel.findOneAndUpdate(
        { _id: transactionId },
        {
          ...transactionForExchange,
        },
        { new: true }
      );

      res.status(200).json({ editedTransaction });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

module.exports = transactionRouter;
