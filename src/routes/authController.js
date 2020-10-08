const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const connection = require("../database");
const config = require("../config");
const mail = require("../utility/mail");

// activacion de cuenta
// router.get("/account/activate", (req, res ) =>{
//   connection.query(
//     "",
//     [user.email, user.password],
//     (err, rows) => {
//       if (rows.length > 0 && !err) {
//         const token = jwt.sign({ id: rows[0].id_usuario }, config.secret);
//         res.json({ auth: true, token });
//       } else res.status(400).json({ auth: false });
//     }
//   );
// });

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

// login
router.post("/login", (req, res) => {
  const user = req.body;

  connection.query(
    "select id_usuario from usuarios where correo = ? and contrasena = MD5( ? ) and tipo_login = 1",
    [user.email, user.password],
    (err, rows) => {
      if (rows.length > 0 && !err) {
        const token = jwt.sign({ id: rows[0].id_usuario }, config.secret);
        res.json({ auth: true, token });
      } else res.status(400).json({ auth: false });
    }
  );
});

// registro de usuario
router.post("/signup", (req, res) => {
  // email, password, nombre, lastname1, lastname2, tipo_login, fk_referido
  const data = req.body;

  const query =
    "INSERT INTO usuarios( correo, contrasena, tipo_login, fk_referido, estatus ) " +
    "VALUES ( ?, MD5( ? ), ?, ?, 'Desbloqueado' )";

  // formato del email
  const subject = "Te registraste correctamente en JIMA";
  const html =
    "<br><br><h3 style='text-decoration: none; color:black; '>Te registraste correctamente en JIMA.</h3> <br><b style='text-decoration: none; color:black;'>Para activar tu cuenta y comenzar a usar JIMA, por favor da click en el siguiente enlace (si no has sido tu quien creo la cuenta o está no es activada en las próximas 24 horas, por razones de seguridad será borrada permanentemente).</b><br><a href='https://jima.mx/inicio/?email=$" +
    data.email +
    "'style='text-decoration:none;color: blue;font-weight:bold;font-size: 24px;'>Verificar Cuenta</a>";

  connection.query(
    query,
    [data.email, data.password, data.tipo_login, data.fk_referido],
    (err, rows) => {
      if (!err) {
        registerClient(rows.insertId, data, res); // registro de usuario
        mail(data.email, subject, html, res); // verificacion de email
        res.sendStatus(200);
        // correo duplicado
      } else if (err.code === "ER_DUP_ENTRY") res.sendStatus(400);
      else res.sendStatus(500);
    }
  );
});

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
router.post("/account/recovery", (req, res) => {
  const email = req.body.email;

  //Generar contraseña temporal
  const cadena =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
  let password = "";

  for (let i = 0; i < 8; ++i)
    password += cadena[Math.floor(Math.random() * 62)];

  // formato email
  const subject = "Restaurar contraseña en JIMA";
  const html =
    "<h3 style='text-decoration: none; color:black; '>Solicitaste un cambio de contraseña.</h3> <br><b style='text-decoration:none; font-weight:bold;font-size: 24px;'>Tu contraseña temporal es: <b style='color: red'>" +
    password +
    "</b></b><br><h4>Cambia la contraseña al iniciar sesión o no podrás continuar en JIMA.</h4>";

  const query =
    "UPDATE usuarios SET temporal = '1', contrasena = MD5( ? ) WHERE correo = ?";

  connection.query(query, [password, email], (err, rows) => {
    if (!err && rows.affectedRows) {
      mail(email, subject, html);
      res.json({ send: true });
    } else res.status(500).json({ send: false });
  });
});

module.exports = router;
