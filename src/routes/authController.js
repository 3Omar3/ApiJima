const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const connection = require("../database");
const config = require("../config"); // password token
const mail = require("../utility/mail");

// login
router.post("/login", (req, res) => {
  const user = req.body;

  connection.query(
    "select id_usuario from usuarios where correo = ? and contrasena = MD5( ? ) and tipo_login = ? and activo = 1",
    [user.email, user.password, user.tipo_login],
    (err, rows) => {
      if (!err && rows.length) {
        const token = jwt.sign({ id: rows[0].id_usuario }, config.secret);
        res.status(200).json({ auth: true, token });
      } else res.sendStatus(400);
    }
  );
});

// registro de usuario
router.post("/signup", (req, res) => {
  // email, password, nombre, lastname1, lastname2, tipo_login, fk_referido
  const data = req.body;

  // registro jima, registro api
  data.tipo_login === 1 ? registerJima(data, res) : register(data, res);
});

// registro con Jima
const registerJima = (data, res) => {
  const query =
    "INSERT INTO usuarios( correo, contrasena, tipo_login, fk_referido, estatus ) " +
    "VALUES ( ?, MD5( ? ), 1, ?, 'Desbloqueado' )";

  connection.query(
    query,
    [data.email, data.password, data.fk_referido],
    (err, rows) => {
      if (!err) {
        registerClient(rows.insertId, data, res); // registro de usuario

        // formato del email
        const subject = "Te registraste correctamente en JIMA";
        const html = `<br><br><h3 style='text-decoration: none; color:black; '>Te registraste correctamente en JIMA.</h3> <br><b style='text-decoration: none; color:black;'>Para activar tu cuenta y comenzar a usar JIMA, por favor da click en el siguiente enlace (si no has sido tu quien creo la cuenta o está no es activada en las próximas 24 horas, por razones de seguridad será borrada permanentemente).</b><br><a href='http://192.168.56.1:3000/account/activate?email=${data.email}&id=${rows.insertId}' style='text-decoration:none;color: blue;font-weight:bold;font-size: 24px;'>Verificar Cuenta</a>`;

        mail(data.email, subject, html, res); // verificacion de email
        res.sendStatus(200);
        // correo duplicado
      } else if (err.code === "ER_DUP_ENTRY") res.sendStatus(400);
      else res.status(500).json("error: register user");
    }
  );
};

// registro por medio de api
const register = (data, res) => {
  const query =
    "INSERT INTO usuarios( correo, contrasena, tipo_login, fk_referido, estatus, activo) " +
    "VALUES ( ?, MD5( ? ), ?, ?, 'Desbloqueado', 1 )";

  connection.query(
    query,
    [data.email, data.password, data.tipo_login, data.fk_referido],
    (err, rows) => {
      if (!err) {
        registerClient(rows.insertId, data, res); // registro de usuario
        res.sendStatus(200);
        // correo duplicado
      } else if (err.code === "ER_DUP_ENTRY") res.sendStatus(400);
      else res.status(500).json("error: register user");
    }
  );
};

// registro clientes
const registerClient = (id, data, res) => {
  // hora actual del registro
  const time = new Date();

  const query =
    "INSERT INTO clientes( nombre, primer_apellido, segundo_apellido, fecha_alta, fk_usuario, tipo ) " +
    "VALUES ( ?, ?, ?, ?, ?, 'Cliente' )";

  connection.query(
    query,
    [data.name, data.lastname1, data.lastname2, time, id],
    (err) => {
      if (err) res.status(500).json({ error: "insert client" });
    }
  );
};

// recuperar cuenta
router.put("/account/recovery", (req, res) => {
  const email = req.body.email;

  //Generar contraseña temporal
  const cadena =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
  let password = "";

  for (let i = 0; i < 8; ++i)
    password += cadena[Math.floor(Math.random() * 62)];

  // formato email
  const subject = "Restaurar contraseña en JIMA";
  const html = `<h3 style='text-decoration: none; color:black; '>Solicitaste un cambio de contraseña.</h3> <br><b style='text-decoration:none; font-weight:bold;font-size: 24px;'>Tu contraseña temporal es: <b style='color: red'>${password}</b></b><br><h4>Cambia la contraseña al iniciar sesión o no podrás continuar en JIMA.</h4>`;

  const query =
    "UPDATE usuarios SET temporal = '1', contrasena = MD5( ? ) WHERE correo = ? AND tipo_login = 1";

  connection.query(query, [password, email], (err, rows) => {
    if (!err && rows.affectedRows) {
      mail(email, subject, html, res);
      res.sendStatus(200);
    } else res.status(500).json({ error: "no se encontro el correo" });
  });
});

// activar cuenta
router.get("/account/activate", (req, res) => {
  // email, id
  const data = req.query;
  const query =
    "UPDATE usuarios SET activo = 1 WHERE correo = ? AND id_usuario = ?";

  connection.query(query, [data.email, data.id], (err, rows) => {
    if (!err && rows.affectedRows)
      res.status(200).sendFile(__dirname + "/views/activate.html");
    else res.status(500).json({ error: "activate account" });
  });
});

module.exports = router;
