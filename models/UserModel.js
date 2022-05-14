const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  login: { type: String, required: true, unique: true, maxlength: 15 },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6, maxlength: 100 },
  bankAccount: { type: String, default: "", maxlength: 150 },
});

const UserModel = mongoose.model("User", UserSchema);

module.exports = UserModel;
