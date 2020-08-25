const express = require("express");
const router = express.Router();

const connection = require("../database");

router.get("/usuarios", (req, res) => {
  connection.query("select * from usuarios", (err, rows, fields) => {
    if (!err) res.json(rows);
    else console.log(err);
  });
});

router.get("/usuarios/:id", (req, res) => {
  const { id } = req.params;
  connection.query(
    "select * from usuarios where ID_Usuario = ?",
    [id],
    (err, rows, fields) => {
      if (!err) res.json(rows);
      else console.log(err);
    }
  );
});

router.post("/usuarios", (req, res) => {
  const data = req.body;

  // corre, contrasenia, foto, tipo_login, fk_referido, puesto
  const query = "CALL insertarUsuario( ?, ?, ?, ?, ?, ? )";

  connection.query(
    query,
    [
      data.correo,
      data.contrasenia,
      data.foto,
      data.tipo_login,
      data.fk_referido,
      data.puesto,
    ],
    (err, rows, fields) => {
      if (!err) res.json({ Status: "Usuario Creado" });
      else res.json({ Status: err.sqlMessage });
    }
  );
});

module.exports = router;
