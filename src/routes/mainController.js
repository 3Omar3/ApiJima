const express = require("express");
const router = express.Router();

const verifyToken = require("./token"); // verify token
const { modelo, purchase, sale, report } = require("../utility/index");

router.get("/data", verifyToken, async (req, res) => {
  try {
    // test 1287
    const precios = await modelo.getPrecios();
    const balance = await modelo.getBalance(req.idClient);
    const saldos = await modelo.getDetalleSaldo(req.idClient);
    const proyecciones = await modelo.getProyecciones(req.idClient);

    res.status(200).json({
      precios,
      balance,
      saldos,
      proyecciones,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/purchase/years", verifyToken, async (req, res) => {
  try {
    const years = await purchase.getPruchaseYears();
    res.status(200).json({ years });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/purchase/predios", verifyToken, async (req, res) => {
  try {
    const predios = await purchase.getPurchasePredios(
      req.body.anio,
      req.idClient
    );

    res.status(200).json({ predios });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/purchase", verifyToken, async (req, res) => {
  try {
    const years = await purchase.getPruchaseYears();
    const predios = await purchase.getPurchasePredios(
      years[years.length - 1],
      req.idClient
    );

    res.status(200).json({ years, predios });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/sale/predios", verifyToken, async (req, res) => {
  try {
    const predios = await sale.getSalePredios(req.body.anio, req.idClient);

    res.status(200).json({ predios });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/sale", verifyToken, async (req, res) => {
  try {
    const check = await sale.checkSalePredios(req.idClient);
    if (!check) return res.status(400).json("no hay predios");

    const years = await sale.getSaleYears();
    const predios = await sale.getSalePredios(
      years[years.length - 1],
      req.idClient
    );

    res.status(200).json({ years, predios });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/report/transacciones", verifyToken, async (req, res) => {
  try {
    const transacciones = await report.getTransacciones(
      req.body.tipo,
      req.idClient
    );

    res.status(200).json({ transacciones });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
