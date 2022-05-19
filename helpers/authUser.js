const jwt = require("jsonwebtoken");

const authUser = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token)
    return res
      .status(403)
      .json({ message: "Nieprawidłowy token - dostęp zabroniony." });

  try {
    jwt.verify(token, process.env.JWT_SECRET, (err, encoded) => {
      if (err) {
        if (err.name === "TokenExpiredError")
          return res.status(401).json({
            message:
              "Ze względów bezpieczeństwa tokeny są ważne 3 dni po zalogowaniu. Twój token wygasł - prosimy o ponowne zalogowanie się.",
          });
        return res.status(400).json({ message: err.message });
      }

      req.user = encoded;
      next();
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = authUser;
