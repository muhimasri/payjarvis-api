'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
const port = process.env.PORT || 3000;

const config = require('config');


let apiRoutes = require("./src/api/api-routes");

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Methods', 'DELETE, PUT');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

mongoose.connect(config.db.connectionString, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
})
  .then(() => console.log('DB Connected!'))
  .catch(err => {
  console.log(`DB Connection Error: ${err.message}`);
});

  const stripe = require("stripe")(config.stripe.secretKey); 
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
    // sendMessage();
});