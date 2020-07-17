const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const InitiateMongoServer = require('./src/config/db.config');

const app = express();
dotenv.config();
app.use(cors());
InitiateMongoServer();

const port = process.env.PORT || 5000;

// Set up express to parse request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Controllers

app.use('/', (req, res) => {
  res.json({
    message: 'Schoolflow is running'
  })
});

app.listen(port, () => {
  console.log(`App running on :  ${port}`);
});
