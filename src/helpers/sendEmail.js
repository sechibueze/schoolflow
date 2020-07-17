const nodemailer = require("nodemailer");

module.exports = function (user, req, res) {

  token = user.generateVerificationToken();
  // Save the verification token
  token.save(function (err) {
    if (err) return res.status(500).json({ status: false, message: 'could not save token' });

    let link = "http://" + req.headers.host + "/api/v1/auth/verify/" + token.token;

    const mailOptions = {
      to: user.email,
      from: process.env.FROM_EMAIL,
      subject: 'Account Verification Token',
      text: `Hi ${user.firstname} \n 
                  Please click on the following link ${link} to verify your account. \n\n 
                  If you did not request this, please ignore this email.\n`,
    };

    const transporter = nodemailer.createTransport({
      // service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.FROM_EMAIL,
        pass: process.env.FROM_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    transporter.sendMail(mailOptions, function (err, info) {
      if (err) return res.status(500).json({ status: false, message: 'Mail not sent' });
      console.log('Email sent gathering response', user_.generateJWT())
      // const userJWT = user_.generateJWT();
      return res.json({
        status: true,
        message: 'User signup successfully',
        // token: userJWT,
        info,
        userToken: token,
        user: user_
      })
    });


  });

}

