const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const connection = require("../database");
const config = require("../config");

// verificacion del token
function verifyToken(req, res, next) {
  const token = req.headers["access-token"];

  if (token) {
    // decodificacion token
    jwt.verify(token, config.secret, (err, authData) => {
      if (err) res.sendStatus(401);
      else {
        req.id = authData.id;
        next();
      }
    });
  } else res.sendStatus(401);
}

router.get("/login", (req, res) => {
  const user = req.body;

  connection.query(
    "select id_usuario from usuarios where correo = ? and contrasena = MD5( ? )",
    [user.correo, user.contrasenia],
    (err, rows, fields) => {
      if (rows.length > 0 && !err) {
        const token = jwt.sign({ id: rows[0].id_usuario }, config.secret);
        res.json({ auth: true, token });
      } else res.json({ auth: false });
    }
  );
});

// registro de usuario
router.post("/signup", (req, res) => {
  // corre, contrasenia, foto, tipo_login, fk_referido, puesto
  const data = req.body;
  // predeterminado
  const fill = {
    estatus: "Desbloqueado",
    intentos: 0,
    tiempo_inicio: "0000-00-00 00:00:00",
    tiempo_final: "0000-00-00 00:00:00",
    ultimo_intento: "0000-00-00 00:00:00",
    activo: 0,
    temporal: 0,
    vendedor: 0,
    calificacion: 0,
  };

  const query =
    "INSERT INTO usuarios( correo, contrasena, foto, tipo_login, fk_referido, puesto, estatus, intentos, tiempo_inicio, tiempo_final, ultimo_intento, activo, temporal, vendedor, calificacion ) " +
    "VALUES ( ?, MD5( ? ), ?, ?, ?, ?, ?, ?, ?, ?, ?, ? ,? , ?, ? )";

  connection.query(
    query,
    [
      data.correo,
      data.contrasenia,
      data.foto,
      data.tipo_login,
      data.fk_referido,
      data.puesto,
      fill.estatus,
      fill.intentos,
      fill.tiempo_inicio,
      fill.tiempo_final,
      fill.ultimo_intento,
      fill.activo,
      fill.temporal,
      fill.vendedor,
      fill.calificacion,
    ],
    (err, rows, fields) => {
      if (!err) {
        const token = jwt.sign({ id: rows.insertId }, config.secret);
        res.json({ auth: true, token });
      } else res.json({ auth: false, Status: err.sqlMessage });
    }
  );
});

module.exports = router;
