'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
const port = process.env.PORT || 3000;

let apiRoutes = require("./src/api/api-routes");

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const connectionString = 'mongodb+srv://muhi:muhiatlasadmin@cluster0-qyxst.mongodb.net/PayJarvis?retryWrites=true&w=majority';
mongoose.connect(connectionString, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
})
  .then(() => console.log('DB Connected!'))
  .catch(err => {
  console.log(`DB Connection Error: ${err.message}`);
});

// var db = mongoose.connection;

// if(!db){
//   console.log("Error connecting db");
// }
// else {
//   console.log("Db connected successfully")
// }


app.get('/', (req, res) => res.send('Hello World with Express'));

// Use Api routes in the App
app.use('/api', apiRoutes);
// Launch app to listen to specified port
app.listen(port, function () {
    console.log("Running RestHub on port " + port);
});