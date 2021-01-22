const nodemailer = require("nodemailer"); // email sender function

// envio de correo
const sendMail = (email, subject, html) => {
  // cuenta de correo
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "pepetonio41@gmail.com",
      pass: "elpantuflo123",
    },
  });

  const mailOptions = {
    from: '"JIMA", <pepetonio41@gmail.com>',
    to: email,
    subject,
    html:
      "<p style='text-align: center;'><img src='https://jima.mx/inicio/vistas/assets/media/logos/JIMA-01.png' alt='JIMA' width='35%'></p>" +
      html,
  };

  transporter.sendMail(mailOptions, (e) => {
    return new Error({ error: "send mail" });
  });
};

module.exports = sendMail;
