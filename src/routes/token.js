const jwt = require("jsonwebtoken"); // token
const config = require("../config"); // password token

// verificacion del token
function verifyToken(req, res, next) {
  const token = req.headers["access-token"];

  if (token) {
    // decodificacion token
    jwt.verify(token, config.secret, (err, authData) => {
      if (err) return res.sendStatus(401);

      req.idUser = authData.idUser;
      req.idClient = authData.idClient;
      next();
    });
  } else res.sendStatus(401);
}

module.exports = verifyToken;
