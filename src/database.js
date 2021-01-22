const mysql = require("promise-mysql");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "admin123",
  database: "jima",
});

function getConnection() {
  return connection;
}

module.exports = { getConnection };
