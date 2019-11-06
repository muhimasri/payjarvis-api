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
        amount: req.body.amount * 100,
        currency: "cad",
        metadata: {
          ticketId: req.body.ticketId
        },
        description: "Parking Ticket Payment",
        source: req.body.token
      });

      if (stripeResults) {
      }

      const updatedTicket = await updateTicket(req.body.ticketId, stripeResults);
      const User = require('./src/models/userModel');
      User.findByIdAndUpdate(updatedTicket.userId, {$set: {email: req.body.email}}, {new:true},
        (err,doc) => {
          res.json('Success');
      });
      // res.json({status});
    } catch (err) {
      console.log(err);
      res.status(500).end();
    }
  });

  async function updateTicket(ticketId, paymentDetails) {
    const Ticket = require('./src/models/ticketModel');
    return new Promise(resolve => {
      Ticket.findByIdAndUpdate(ticketId, {$set: {isPaid: true, paymentDetails}}, {new:true},
        (err,doc) => {
          resolve(doc);
      });
    });
  }

  function sendEmail() {
    var nodemailer = require('nodemailer');

    var transporter = nodemailer.createTransport({
      host: 'smtp-mail.outlook.com',
      secureConnection: false, // TLS requires secureConnection to be false
      port: 587, // port for secure SMTP
      tls: {
        ciphers:'SSLv3'
      },
      auth: {
        user: 'muhi@payjarvis.com',
        pass: 'Mem@5048'
      }
    });

    var mailOptions = {
      from: 'muhi@payjarvis.com',
      to: 'muhimasri@gmail.com',
      subject: 'Sending Email using Node.js',
      html: '<!DOCTYPE html><html><head> <meta charset="utf-8"> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <meta name="viewport" content="width=device-width, initial-scale=1"> <title>Receipt</title> <link href="https://fonts.googleapis.com/css?family=Roboto:100,100i,300,300i,400,400i,500,500i,700,700i,900,900i" rel="stylesheet"> <style>*{margin: 0; padding: 0;}body{font-family: \'Roboto\', sans-serif;}h3.site--outer-titme{text-align: center; padding: 10px 10px 0 10px; font-weight: normal; text-transform: uppercase; color: #999; font-size: 16px;}.cotainer-inner{width: 100%; margin: 15px auto; max-width: 350px; box-shadow: 0px 0px 6px -4px #000; padding: 15px;}.cotainer-inner img.main-img{width: 100%; max-width: 240px; margin: auto; display: block; margin-bottom: 15px;}.detail-data.payment-title h4{margin-bottom: 20px; text-align: center;}h4.site--main{font-weight: 400; color: #02acb7; font-size: 24px;}.payment-details ul{list-style: none; padding-bottom: 5px; border-bottom: 1px solid rgba(27, 53, 53, 0.1); margin-top: 20px;}.payment-details ul li{color: #1B3535; font-size: 14px; padding-bottom: 10px; letter-spacing: 0.02em; height: 20px;}.payment-details ul li span:nth-child(1){float: left;}.payment-details ul li span:nth-child(2){float: right;}.disable-font{color: rgba(27, 53, 53, 0.4) !important;}</style></head><body> <div class="main-container"> <h3 class="site--outer-titme">Your Parking Ticket Butler </h3> <div class="cotainer-inner"> <div class="detail-data payment-title"><img src="images/email.png" class="main-img"> <h4 class="site--main">Paid Receipt</h4> <div class="payment-details"> <ul> <li> <span class="disable-font"> Violation Notice Number </span><span>PB465465</span></li><li> <span class="disable-font"> Payment Amount </span><span>$12.00</span></li><li> <span class="disable-font"> Payment Date </span><span>13 September 2019</span></li><li> <span class="disable-font"> Referece Number </span><span>4564654</span></li></ul> </div><div class="payment-details"> <ul> <li> <span class="disable-font"> Administrative Penalty </span><span>$50.00</span></li><li> <span class="disable-font"> Address Search Fee </span><span>$12.00</span></li><li> <span class="disable-font"> Late Payment Fee </span><span>$25.00</span></li><li> <span class="disable-font"> Service Charge </span><span>$8.23</span></li></ul> <ul> <li>test@gmail.com<span>$9.50</span></li><li>xxx@gmail.com<span>$80.00</span></li></ul> <ul class="border-0"> <li>Total<span>$00.00</span></li></ul> </div></div><div class="cantainer-footer"> <p>Made in Toronto by Onebill</p><div class="condition-link"><a href="#">Privacy &amp; Terms</a><a href="#">Contact Us</a></div></div></div></div></body></html>'
    };

    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  }


app.get('/', (req, res) => {
  sendEmail();
  res.json('HEYYYYYY');
});

// Use Api routes in the App
app.use('/api', apiRoutes);
// Launch app to listen to specified port
app.listen(port, function () {
    console.log("Running RestHub on port " + port);
    // sendMessage();
});