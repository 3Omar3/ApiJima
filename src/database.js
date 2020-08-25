const mysql = require("mysql");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "admin123",
  database: "jima",
});

connection.connect(function (err) {
  if (err) console.log("error");
  else console.log("connected");
});

module.exports = connection;
