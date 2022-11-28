const jwt = require("jsonwebtoken");

function tokenValidation(req, res, next) {
  const auth = req.get("Authorization");
  const authType = auth?.startsWith("Bearer ");
  if (!auth || !authType) {
    return res.status(401).json({
      error: "missing or invalid token",
    });
  }

  const token = auth.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decodedToken) => {
    if (err) next(err);
    req.user = decodedToken;
  });
  return next();
}

module.exports = tokenValidation;
