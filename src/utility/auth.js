const jwt = require("jsonwebtoken");

const { getConnection } = require("../database"); // mysql-promise
const config = require("../config"); // password token
const mail = require("../utility/mail");

async function login(user) {
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

    return token;
  } catch (e) {
    throw e;
  }
}

// registro de usuario
async function signup(data) {
  try {
    // registro jima, registro api
    data.tipo_login === 1 ? await registerJima(data) : await register(data);

    return true;
  } catch (e) {
    throw e;
  }
}

// registro con Jima
async function registerJima(data) {
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

    return true;
  } catch (e) {
    throw e;
  }
}

// registro por medio de api
async function register(data) {
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
    return true;
  } catch (e) {
    throw e;
  }
}

// registro clientes
async function registerClient(id, data) {
  // hora actual del registro
  const time = new Date();

  const sql =
    "INSERT INTO clientes( nombre, primer_apellido, segundo_apellido, fecha_alta, fk_usuario, tipo ) " +
    "VALUES ( ?, ?, ?, ?, ?, 'Cliente' )";

  try {
    const conn = await getConnection();
    await conn.query(sql, [data.name, data.lastname, data.lastname2, time, id]);
  } catch (e) {
    throw e;
  }
}

async function recoveryAccount(email) {
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
    return true;
  } catch (e) {
    throw e;
  }
}

async function activateAccount(data) {
  const sql =
    "UPDATE usuarios SET activo = 1 WHERE correo = ? AND id_usuario = ?";

  try {
    const conn = await getConnection();
    const result = await conn.query(sql, [data.email, data.id]);

    if (!result.affectedRows) throw new Error("activate account");
    return true;
  } catch (e) {
    throw e;
  }
}

module.exports = { login, signup, recoveryAccount, activateAccount };
