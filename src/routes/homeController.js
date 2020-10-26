const express = require("express");
const router = express.Router();

const verifyToken = require("./token"); // verify token
const connection = require("../database");

router.get("/prices", verifyToken, (req, res) => {
  connection.query(
    "( SELECT monto FROM precios WHERE tipo = 0 ORDER BY id_precio DESC LIMIT 1 ) UNION ( SELECT monto FROM precios WHERE tipo = 1 ORDER BY id_precio DESC LIMIT 1)",
    (err, rows) => {
      if (!err && rows.length) {
        res.status(200).json({ plant: rows[0].monto, kg: rows[1].monto });
      } else res.sendStatus(500);
    }
  );
});

module.exports = router;
