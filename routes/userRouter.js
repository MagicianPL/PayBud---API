const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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
      },
      process.env.JWT_SECRET,
      { expiresIn: "3d" },
      (err, token) => {
        if (err) {
          res.status(400).json({ message: err.message });
        } else {
          user.token = token;
          res.status(200).json({
            _id: user._id,
            login: user.login,
            email: user.email,
            token: user.token,
          });
        }
      }
    );
  }
});

module.exports = userRouter;
