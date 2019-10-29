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
  res.header('Access-Control-Allow-Methods', 'DELETE, PUT');
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

app.post('/twilio/request', (req, res) => {
  console.log(req.body);
})

app.post('/twilio/fallback', (req, res) => {
  console.log(req.body);
})

app.post('/twilio/callback', (req, res) => {
  console.log(req.body);
})

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

    if (req.body.type !== 'text') {
      // const ticketController = require('./src/controllers/ticketController');
      // var request = require('request').defaults({ encoding: null });
      // request.get(req.body.message.content.image.url,
      // function (err, res, body) {
      //     const s3Params = {
      //       Bucket: 'livecords-dev',
      //       Key: Date.now().toString() + '.jpg',
      //       Body: body,
      //       ContentType: 'image/jpeg',
      //       ACL: 'public-read'
      //   };
      //   new Promise(resolve => {
      //     resolve(ticketController.createTicket(s3Params, req.body.from.number))
      //   }).then(data => {
      //     info.msg = 'Click on the link below to pay your ticket. http://teacherstudio.me/ticket-details/' + data.id;
      //   })
      // });
    }
    // if (req.body.text.toLowerCase().indexOf('yes') > -1) {
    //     info.msg = port + ' ' + 'Yay!! Looking forward to being your friend but unfortunately there is nothing I can help you with at the moment.'; 
    // } else if (req.body.text.toLowerCase().indexOf('no') > -1) {
    //     info.msg = 'Ouch! Well, its your loss and also I think we would have not got along anyways.';
    // } else {
    //     info.msg = 'Sorry, didn\'t quite understand. Yes or No?';
    // }
    // SendMessage(info);
    res.status(200).end();
  });

  const stripe = require("stripe")("sk_test_vcIq251ToWrYVdE8bBJRLGYe"); 
  app.post("/charge", async (req, res) => {
    try {
      let stripeResults = await stripe.charges.create({
        amount: req.body.amount,
        currency: "cad",
        metadata: {
          ticketId: req.body.ticketId
        },
        description: "Parking Ticket Payment",
        source: req.body.token
      });
  
      const Ticket = require('./src/models/ticketModel');
      Ticket.findByIdAndUpdate(req.body.ticketId, {$set: {isPaid: true, paymentDetails: stripeResults}}, {new:true},
        function(err,doc){

          res.json('Success');
    });
      // res.json({status});
    } catch (err) {
      console.log(err);
      res.status(500).end();
    }
  });


app.get('/', (req, res) => res.send('Hello World with Express'));

// Use Api routes in the App
app.use('/api', apiRoutes);
// Launch app to listen to specified port
app.listen(port, function () {
    console.log("Running RestHub on port " + port);
});