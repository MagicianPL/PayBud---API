const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Cryptr = require("cryptr");
const cryptr = new Cryptr(process.env.CRYPTR_SECRET);

const UserModel = require("../models/UserModel");
const authUser = require("../helpers/authUser");

const userRouter = express.Router();

//SIGN UP
userRouter.post("/register", async (req, res) => {
  const { login, email, password, repeatedPassword } = req.body;
  //validation
  if (
    !login.trim() ||
    login.trim() > 15 ||
    !email.trim() ||
    !password.trim() ||
    password.trim().length < 6
  ) {
    return res
      .status(400)
      .json({ message: "Błąd: Nie wszystkie dane zostały poprawnie wpisane" });
  } else if (password !== repeatedPassword) {
    return res
      .status(400)
      .json({ message: "Podane hasła nie są ze sobą zgodne" });
  }

  try {
    //Checking if user with this email or password already exists
    let existingUser;
    existingUser = await UserModel.findOne({ login: login });
    if (!existingUser) {
      existingUser = await UserModel.findOne({ email: email });
    }
    if (existingUser)
      return res.status(400).json({
        message:
          "Użytkownik o podanym loginie lub adresie e-mail istnieje już w systemie.",
      });
    //Create new user
    const createdUser = new UserModel({
      login,
      email,
      password: bcrypt.hashSync(req.body.password, 8),
    });
    await createdUser.save();

    res.status(201).json(createdUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

//SIGN IN
userRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email.trim() || !password.trim()) {
    return res
      .status(400)
      .json({ message: "Nieprawidłowa nazwa użytkownika lub hasło" });
  }

  //Checking if user exist in DB
  const existingUser = await UserModel.findOne({ email });
  if (!existingUser) {
    return res
      .status(404)
      .json({ message: "Nieprawidłowa nazwa użytkownika lub hasło" });
  }
  //Checking if password matches
  const auth = bcrypt.compareSync(password, existingUser.password);

  if (!auth) {
    return res
      .status(404)
      .json({ message: "Nieprawidłowa nazwa użytkownika lub hasło" });
  } else {
    const user = existingUser.toObject();
    jwt.sign(
      {
        _id: user._id,
        login: user.login,
        email: user.email,
        bankAccount: user.bankAccount ? true : null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
      (err, token) => {
        if (err) {
          res.status(400).json({ message: err.message });
        } else {
          user.token = token;
          res.status(200).json({
            _id: user._id,
            login: user.login,
            email: user.email,
            bankAccount: user.bankAccount ? true : null,
            token: user.token,
          });
        }
      }
    );
  }
});

//UPDATE User - Bank Account and Mobile Phone Number
userRouter.patch("/users/:userId", authUser, async (req, res) => {
  const { userId } = req.params;
  const { user } = req;
  const { bankAccount, phoneNumber } = req.body;

  if (userId !== user._id)
    return res.status(403).json({ message: "Dostęp zabroniony." });

  if (
    !bankAccount ||
    bankAccount.trim().length < 26 ||
    !phoneNumber ||
    phoneNumber.trim().length !== 9
  )
    return res.status(400).json({ message: "Wprowadzono nieprawidłowe dane." });

  try {
    const userFromDB = await UserModel.findById(user._id);
    if (!userFromDB)
      return res.status(404).json({ message: "Nie znaleziono użytkownika." });

    if (userFromDB.bankAccount || userFromDB.phoneNumber)
      return res
        .status(400)
        .json({
          message:
            "Użytkownik ma już przypisane dane. Ze względów bezpieczeństwa skontaktuj się z obsługą aby je zmienić.",
        });

    const hashedBackAccount = cryptr.encrypt(bankAccount);
    const hashedPhoneNumber = cryptr.encrypt(phoneNumber);
    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: user._id },
      { bankAccount: hashedBackAccount, phoneNumber: hashedPhoneNumber },
      { new: true }
    );

    res.status(200).json({
      _id: updatedUser._id,
      login: updatedUser.login,
      email: updatedUser.email,
      bankAccount: updatedUser.bankAccount ? true : null,
      phoneNumber: updatedUser.phoneNumber ? true : null,
      token: jwt.sign(
        {
          _id: updatedUser._id,
          login: updatedUser.login,
          email: updatedUser.email,
          bankAccount: updatedUser.bankAccount ? true : null,
          phoneNumber: updatedUser.phoneNumber ? true : null,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "1d",
        }
      ),
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = userRouter;
