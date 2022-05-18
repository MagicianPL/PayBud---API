const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const userRouter = require("./routes/userRouter");
const transactionRouter = require("./routes/transactionRouter");

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api", userRouter, transactionRouter);

mongoose
  .connect(process.env.MONGO_DB_URI)
  .then(() => console.log("Connected to the DB"))
  .catch((err) => console.log(err.message));

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Hello from a homepage",
  });
});

app.get("/api", (req, res) => {
  res.status(200).json({
    message: "Hello from node.js",
  });
});

app.listen(process.env.PORT || 5000, () => {
  console.log(
    `Server is listening on port ${
      process.env.PORT ? process.env.PORT : "5000"
    }`
  );
});
