'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
const moment = require('moment');
const port = process.env.PORT || 3000;

const config = require('config');


let apiRoutes = require("./src/api/api-routes");

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));

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
      const totalAmount = req.body.amount;  
      let stripeResults = await stripe.charges.create({
        amount: totalAmount * 100,
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
      const info = {
        plateNumber: updatedTicket.plateNumber,
        amount: totalAmount,
        date: moment(new Date()).format('MMMM Do YYYY'),
        administrativePenaltyAmount: updatedTicket.administrativePenaltyAmount,
        service: totalAmount - Number(updatedTicket.administrativePenaltyAmount),
        total: totalAmount,
        imagePath: "\"http://teacherstudio.me/assets/images/email.png\""
      };
      sendEmail(info, req.body.email);
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

  function sendEmail(info, email) {
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
      to: email,
      subject: 'Parking Payment Reciept',
      html: `<!DOCTYPE html><html><head> <meta charset="utf-8"> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <meta name="viewport" content="width=device-width, initial-scale=1"> <title>Receipt</title> <link href="https://fonts.googleapis.com/css?family=Roboto:100,100i,300,300i,400,400i,500,500i,700,700i,900,900i" rel="stylesheet"> <style>*{margin: 0; padding: 0;}html{background: #f6f6f6;}body{font-family: 'Roboto', sans-serif;}h3.site--outer-titme{text-align: center; padding: 40px 10px 17px 10px; font-weight: normal; text-transform: uppercase; color: #1B3535; font-size: 16px;}.cotainer-inner{width: 100%; margin: 15px auto; max-width: 450px; /* box-shadow: 0px 15px 30px rgba(0,0,0,0.16); */ padding: 15px 0; background: #fff; /* border-radius: 20px; */}.cotainer-inner img.main-img{width: 100%; max-width: 240px; margin: auto; display: block; margin-bottom: 15px;}.detail-data.payment-title h4{margin-bottom: 5px; text-align: center;}h4.site--main{font-weight: 400; color: #02acb7; font-size: 24px;}.payment-details{width:100%; padding-bottom: 5px; border-bottom: 1px solid rgba(27, 53, 53, 0.1); padding: 15px;}.payment-details tr{color: #1B3535; font-size: 14px; padding-bottom: 10px; letter-spacing: 0.02em; height: 32px;}.td-1{color: rgba(27, 53, 53, 0.4);}.td-2{text-align: right;}.border-0{border: 0 !important;}.cantainer-footer{text-align: center;margin-top: 15px; font-size: 14px;}.cantainer-footer p{color: rgba(27,53,53,0.4);margin-bottom: 5px;}.condition-link a{display: inline-block;text-decoration: none;padding: 2px 9px 0 4px;color: rgba(0,170,183,0.702);}.border-right{border-right: 1px solid; color: rgba(0,170,183,0.702); margin-left: 5px;}</style></head><body> <div class="main-container"> <h3 class="site--outer-titme">Your Parking Ticket Butler </h3> <div class="cotainer-inner"> <div class="detail-data payment-title"><img src=${info.imagePath}class="main-img"> <h4 class="site--main">Paid Receipt</h4> <table class="payment-details"> <tr> <td class="td-1"> Violation Notice Number </td><td class="td-2">${info.plateNumber}</td></tr><tr> <td class="td-1"> Payment Amount </td><td class="td-2">$${info.amount}</td></tr><tr> <td class="td-1"> Payment Date </td><td class="td-2">${info.date}</td></tr><tr> <td class="td-1"> Referece Number </td><td class="td-2">4564654</td></tr></table> <table class="payment-details"> <tr> <td class="td-1"> Administrative Penalty </td><td class="td-2">$${info.administrativePenaltyAmount}</td></tr><tr> <td class="td-1"> Service Charge </td><td class="td-2">$${info.service}</td></tr></table> <table class="payment-details"> <tr><td class="td-1">Total</td><td class="td-2">$${info.total}</td></tr></table> </div><div class="cantainer-footer"> <p>Made in Toronto by Onebill</p><div class="condition-link"> <a href="#" class="border-right">Privacy &amp; Terms</a> <a href="#">Contact Us</a></div></div></div></div></body></html>`
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
  // const info = {
  //   plateNumber: 1,
  //   amount: 1,
  //   date: moment(new Date()).format('MMMM Do YYYY'),
  //   administrativePenaltyAmount: 1,
  //   service: 1,
  //   total: 1,
  //   imagePath: "\"http://teacherstudio.me/assets/images/email.png\""
  // };
  // sendEmail(info, 'muhimasri@gmail.com')
  res.json('HEYYYYYY');
});

// Use Api routes in the App
app.use('/api', apiRoutes);
// Launch app to listen to specified port
app.listen(port, function () {
    console.log("Running RestHub on port " + port);
    // sendMessage();
});