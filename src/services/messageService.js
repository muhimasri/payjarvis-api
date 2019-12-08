const MessageModel = require('../models/messageModel');
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

class MessageService {
    constructor() {};

    saveMessage(type, data) {
        const message = new MessageModel();
        message.details = data;
        message.type = type;
        message.save(res => {
            console.log('Saved');
        });
    }

    sendMessage(to, msg) {
        client.messages
          .create({
            body: msg,
            messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
            from: process.env.TWILIO_PHONE_NUMBER,
            to
          })
          .then(message => console.log(message.sid));
      }

       // console.log(req.body);  
    // const info = {
    //     to: req.body.type === 'text' ? req.body.msisdn : req.body.from.number,
    //     msg: ''
    // }

    // if (req.body.type !== 'text') {
    //   // const ticketController = require('./src/controllers/ticketController');
    //   // var request = require('request').defaults({ encoding: null });
    //   // request.get(req.body.message.content.image.url,
    //   // function (err, res, body) {
    //   //     const s3Params = {
    //   //       Bucket: 'livecords-dev',
    //   //       Key: Date.now().toString() + '.jpg',
    //   //       Body: body,
    //   //       ContentType: 'image/jpeg',
    //   //       ACL: 'public-read'
    //   //   };
    //   //   new Promise(resolve => {
    //   //     resolve(ticketController.createTicket(s3Params, req.body.from.number))
    //   //   }).then(data => {
    //   //     info.msg = 'Click on the link below to pay your ticket. http://teacherstudio.me/ticket-details/' + data.id;
    //   //   })
    //   // });
    // }
    // // if (req.body.text.toLowerCase().indexOf('yes') > -1) {
    // //     info.msg = port + ' ' + 'Yay!! Looking forward to being your friend but unfortunately there is nothing I can help you with at the moment.'; 
    // // } else if (req.body.text.toLowerCase().indexOf('no') > -1) {
    // //     info.msg = 'Ouch! Well, its your loss and also I think we would have not got along anyways.';
    // // } else {
    // //     info.msg = 'Sorry, didn\'t quite understand. Yes or No?';
    // // }
    // // SendMessage(info);
}

module.exports = MessageService;