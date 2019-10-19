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

app.post('/webhooks/deliver', (req, res) => {
  console.log(req.body);
  res.status(200).end();
});
app.post('/webhooks/inbound', (req, res) => {
    console.log(req.body);
    const info = {
        to: req.body.type === 'text' ? req.body.msisdn : req.body.from.number,
        msg: ''
    }
    // if (req.body.text.toLowerCase().indexOf('yes') > -1) {
    //     info.msg = port + ' ' + 'Yay!! Looking forward to being your friend but unfortunately there is nothing I can help you with at the moment.'; 
    // } else if (req.body.text.toLowerCase().indexOf('no') > -1) {
    //     info.msg = 'Ouch! Well, its your loss and also I think we would have not got along anyways.';
    // } else {
    //     info.msg = 'Sorry, didn\'t quite understand. Yes or No?';
    // }
    info.msg = 'Click on the link below to pay your ticket. http://teacherstudio.me/ticket-details .';
    SendMessage(info);
    res.status(200).end();
  });


app.get('/', (req, res) => res.send('Hello World with Express'));

// Use Api routes in the App
app.use('/api', apiRoutes);
// Launch app to listen to specified port
app.listen(port, function () {
    console.log("Running RestHub on port " + port);
});