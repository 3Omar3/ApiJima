const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const { getConnection } = require("../database"); // mysql-promise
const config = require("../config"); // password token
const mail = require("../utility/mail");

// login
router.post("/login", async (req, res) => {
  const user = req.body;

  try {
    const conn = await getConnection();
    // get id_usuario
    const resUser = await conn.query(
      "select id_usuario as id from usuarios where correo = ? and contrasena = MD5( ? ) and tipo_login = ? and activo = 1",
      [user.email, user.password, user.tipo_login]
    );

    // get id_client
    const resClient = await conn.query(
      "SELECT id_cliente as id from clientes WHERE fk_usuario = ?",
      [resUser[0].id]
    );

    // generate token
    const token = jwt.sign(
      { idUser: resUser[0].id, idClient: resClient[0].id },
      config.secret
    );
    res.status(200).json({ token });
  } catch (e) {
    res.status(400).json({ error: "invalid user or activate account" });
  }
});

// registro de usuario
router.post("/signup", (req, res) => {
  // email, password, nombre, lastname1, lastname2, tipo_login, fk_referido
  const data = req.body;

  // registro jima, registro api
  data.tipo_login === 1 ? registerJima(data, res) : register(data, res);
});

// registro con Jima
const registerJima = async (data, res) => {
  const sql =
    "INSERT INTO usuarios( correo, contrasena, tipo_login, fk_referido, estatus ) " +
    "VALUES ( ?, MD5( ? ), 1, ?, 'Desbloqueado' )";

  try {
    const conn = await getConnection();
    const result = await conn.query(sql, [
      data.email,
      data.password,
      data.fk_referido,
    ]);

    // registro de cliente
    registerClient(result.insertId, data);

    // formato del email
    const subject = "Te registraste correctamente en JIMA";
    const html = `<br><br><h3 style='text-decoration: none; color:black; '>Te registraste correctamente en JIMA.</h3> <br><b style='text-decoration: none; color:black;'>Para activar tu cuenta y comenzar a usar JIMA, por favor da click en el siguiente enlace (si no has sido tu quien creo la cuenta o está no es activada en las próximas 24 horas, por razones de seguridad será borrada permanentemente).</b><br><a href='http://192.168.56.1:3000/account/activate?email=${data.email}&id=${result.insertId}' style='text-decoration:none;color: blue;font-weight:bold;font-size: 24px;'>Verificar Cuenta</a>`;
    mail(data.email, subject, html); // verificacion de email

    res.sendStatus(200);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") res.sendStatus(400);
    else res.status(500).json({ error: e.message });
  }
};

// registro por medio de api
const register = async (data, res) => {
  const sql =
    "INSERT INTO usuarios( correo, contrasena, tipo_login, fk_referido, estatus, activo) " +
    "VALUES ( ?, MD5( ? ), ?, ?, 'Desbloqueado', 1 )";

  try {
    const conn = await getConnection();
    const result = await conn.query(sql, [
      data.email,
      data.password,
      data.tipo_login,
      data.fk_referido,
    ]);

    // registro de usuario
    registerClient(result.insertId, data);
    res.sendStatus(200);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") res.sendStatus(400);
    else res.status(500).json({ error: e.message });
  }
};

// registro clientes
const registerClient = async (id, data) => {
  // hora actual del registro
  const time = new Date();

  const sql =
    "INSERT INTO clientes( nombre, primer_apellido, segundo_apellido, fecha_alta, fk_usuario, tipo ) " +
    "VALUES ( ?, ?, ?, ?, ?, 'Cliente' )";

  try {
    const conn = await getConnection();
    await conn.query(sql, [data.name, data.lastname, data.lastname2, time, id]);
  } catch (e) {
    throw new Error(e);
  }
};

// recuperar cuenta
router.put("/account/recovery", async (req, res) => {
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

  const sql =
    "UPDATE usuarios SET temporal = '1', contrasena = MD5( ? ) WHERE correo = ? AND tipo_login = 1";

  try {
    const conn = await getConnection();
    const result = await conn.query(sql, [password, email]);

    if (!result.affectedRows) throw new Error("correo no registrado");

    mail(email, subject, html);
    res.sendStatus(200);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// activar cuenta
router.get("/account/activate", async (req, res) => {
  // email, id
  const data = req.query;
  const sql =
    "UPDATE usuarios SET activo = 1 WHERE correo = ? AND id_usuario = ?";

  try {
    const conn = await getConnection();
    const result = await conn.query(sql, [data.email, data.id]);

    if (!result.affectedRows) throw new Error("activate account");

    res.status(200).sendFile(__dirname + "/views/activate.html");
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
