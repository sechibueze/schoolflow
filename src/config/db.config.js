const mongoose = require("mongoose");

const InitiateMongoServer = async () => {
  // process.env.MONGODBURI ||
  const MONGOURI = process.env.MONGODBURI || "mongodb://localhost:27017/schoolflow";
  try {
    await mongoose.connect(MONGOURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("Connected to DB !!", MONGOURI);
  } catch (e) {
    console.log(e);
    throw e;
  }
};

module.exports = InitiateMongoServer;