const express = require("express");
const app = express();
const helmet = require("helmet"); // seguridad api rest

// Settings
app.set("port", process.env.PORT || 3000); // proceess.env.PORT puerto automatico por el server

// Middlewares
app.use(express.json()); // convierte recibidos o enviados a formatos json
app.use(helmet()); // activamos la seguridad

// Routes
app.use(require("./routes/authController"));
app.use(require("./routes/homeController"));

// Starting Server
app.listen(app.get("port"), () => {
  console.log("Server on port", app.get("port"));
});
