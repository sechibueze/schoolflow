const express = require("express");
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const crypto = require('crypto');
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const router = express.Router();

const User = require("../model/user");
const sendEmail = require('../helpers/sendEmail')
const Token = require("../model/token");

/**
 * @method - POST
 * @param - /signup
 * @description - User SignUp
 */
router.post("/signup", [
  check("firstname", "Please Enter your Firstname")
    .not()
    .isEmpty(),
  check("lastname", "Please Enter your Lastname")
    .not()
    .isEmpty(),
  check("email", "Please enter a valid email").isEmail(),
  check("password", "Please enter a valid password").isLength({
    min: 6
  })
],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        error: errors.array()
      });
    }

    console.log('User data passed signup validations')
    const {
      firstname,
      lastname,
      email,
      password
    } = req.body;


    try {
      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({
          status: false,
          error: "User Already Exists"
        });
      }

      user = new User({
        firstname,
        lastname,
        email,
        password
      });

      // Password will be hashed before save() if it wasnt modified
      user.save((err) => {
        if (err) {
          return res.status(400).json({
            status: false,
            error: "Failed to signup user"
          });
        }

        // User has been registered
        // get user token
        const token = user.generateJWT();
        const verificationToken = user.generateVerificationToken();
        verificationToken.save(function (err) {
          if (err) return res.status(500).json({ status: false, error: 'could not save token' });

          // verificationToken has been saved
          // send email
          // let link = "https://" + req.headers.host + "/api/v1/auth/verify/" + verificationToken.token;
          let link = `${req.protocol}://${req.headers.host}/api/auth/verify/${verificationToken.token}`;
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
          // console.log('Transporter wants to send mail', {
          //   user: process.env.FROM_EMAIL,
          //   pass: process.env.FROM_PASSWORD
          // })
          transporter.sendMail(mailOptions, function (err, info) {
            if (err) return res.status(500).json({ status: false, message: 'Mail not sent', err });
            console.log('Email sent gathering response')
            // const userJWT = user_.generateJWT();
            return res.json({
              status: true,
              message: 'User signup successfully',
              token
            })
          });

        })
      });

    } catch (err) {
      console.log(err.message);
      res.status(500).json({
        status: false,
        error: 'Could not signup'
      });;
    }
  }
);

/**
 * @method - POST
 * @param - /login
 * @description - User login
 */
router.post(
  "/login",
  [
    check("email", "Please enter a valid email").isEmail(),
    check("password", "Please enter a valid password").isLength({
      min: 6
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    try {
      let user = await User.findOne({ email });
      if (!user)
        return res.status(400).json({
          status: false,
          error: "User Not Exist"
        });

      const isMatch = user.comparePassword(password);
      if (!isMatch)
        return res.status(400).json({
          status: false,
          error: "Incorrect Username or Password !"
        });

      // Make sure the user has been verified
      if (!user.isVerified) return res.status(401).json({ status: false, error: 'Your account has not been verified.' });


      const payload = {
        user: {
          id: user.id,
          email,
          firstname: user.firstname
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        {
          expiresIn: 3600
        },
        (err, token) => {
          if (err) return res.status(401).json({ status: false, error: 'JWT could not sign payload.' });
          res.status(200).json({
            status: true,
            message: 'login - data complete ',
            email,
            token
          });
        }
      );
    } catch (e) {
      // console.error(e);
      res.status(500).json({
        status: false,
        error: "Server Error"
      });
    }
  }
);



/**
 * @method - GET
 * @param - /verify/:token
 * @description - Verify Signup token
 */
router.get('/verify/:token', async (req, res) => {
  if (!req.params.token) {
    return res.status(400).json({
      status: false,
      error: "Invalid route"
    })
  };

  // There is a req.params.token
  try {
    // Find a matching token
    const token = await Token.findOne({ token: req.params.token });

    if (!token) {
      return res.status(400).json({
        status: false,
        error: 'We were unable to find a valid token. Your token may have expired.'
      });
    }

    // If we found a token, find a matching user
    User.findOne({ _id: token.userId }, (err, user) => {
      if (!user) {
        return res.status(400).json({
          status: false,
          message: 'We were unable to find a user for this token.'
        });
      }

      // user was found
      if (user.isVerified) return res.status(400).json({ status: false, message: 'This user has already been verified.' });

      // Verify and save the user
      user.isVerified = true;
      user.save(function (err) {
        if (err) return res.status(500).json({ message: err.message });

        res.status(200).json({
          status: true,
          message: "The account has been verified. Please log in."
        });
      });
    });
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
});

/**
 * @method - POST
 * @param - /resend
 * @description - resend Signup token
 */
router.post('/resend', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) return res.status(401).json({ message: 'The email address ' + req.body.email + ' is not associated with any account. Double-check your email address and try again.' });

    if (user.isVerified) return res.status(400).json({ message: 'This account has already been verified. Please log in.' });

    const verificationToken = user.generateVerificationToken();
    verificationToken.save(function (err) {
      if (err) return res.status(500).json({ status: false, error: 'could not save token' });

      // verificationToken has been saved
      // send email
      // let link = "https://" + req.headers.host + "/api/v1/auth/verify/" + verificationToken.token;
      let link = `${req.protocol}://${req.headers.host}/api/v1/verify/${verificationToken.token}`;
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
        if (err) return res.status(500).json({ status: false, message: 'Mail not sent', err });
        console.log('Email sent gathering response')
        // const userJWT = user_.generateJWT();
        return res.json({
          status: true,
          message: 'User signup successfully',
          token
        })
      });
      // sendEmail(user, req, res);
    });
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
});

router.get('/:id', (req, res) => {

  User.deleteOne({ _id: req.params.id }, (err, users) => {
    res.json({
      message: 'User deleted',
      data: users
    })
  });
})

router.get('/', (req, res) => {

  User.find((err, users) => {
    res.json({
      message: 'User deleted',
      data: users
    })
  });
})

module.exports = router;