const express = require("express");
const router = express.Router();

const { auth } = require("../utility/index");

// login
router.post("/login", async (req, res) => {
  try {
    const token = await auth.login(req.body);
    res.status(200).json({ token });
  } catch (e) {
    res.status(400).json({ error: "invalid user or activate account" });
  }
});

// registro de usuario
router.post("/signup", async (req, res) => {
  try {
    await auth.signup(req.body);
    res.sendStatus(200);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") res.sendStatus(400);
    else res.status(500).json({ error: e.message });
  }
});

// recuperar cuenta
router.put("/account/recovery", async (req, res) => {
  try {
    await auth.recovery(req.body.email);
    res.sendStatus(200);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// activar cuenta
router.get("/account/activate", async (req, res) => {
  try {
    await auth.activateAccount(req.query);
    res.status(200).sendFile(__dirname + "/views/activate.html");
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
