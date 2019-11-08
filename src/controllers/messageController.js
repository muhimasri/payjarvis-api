const Message = require('../models/messageModel');
const MessageService = require('../services/messageService');
const TicketService = require('../services/ticketService');
var request = require('request').defaults({ encoding: null });
const config = require('config');

// Handle index actions
exports.index = (req, res) => {
    Message.find((err, messages) => {
        if (err) {
            res.json({
                status: "error",
                message: err,
            });
        }
        res.json({
            status: "success",
            message: "messages retrieved successfully",
            data: messages
        });
    });
};

// Handle Inbound Request message actions
exports.inboundRequest = (req, res) => {
    const messageService = new MessageService();
    messageService.saveMessage('inbound', req.body);

    if (typeof (req.body.MediaContentType0) !== 'undefined'
    && req.body.MediaContentType0 !== null
    && req.body.MediaContentType0.indexOf('image') > -1) {
        const ticketService = new TicketService();
        request.get(req.body.MediaUrl0,
        (err, res, body) => {
            const s3Params = {
              Bucket: config.aws.bucket,
              Key: Date.now().toString() + '.jpg',
              Body: body,
              ContentType: 'image/jpeg',
              ACL: 'public-read'
          };
          new Promise(resolve => {
            resolve(ticketService.processTicket(s3Params, req.body.From));
          }).then(data => {
              const msg = `Click on the link below to pay your ticket. ${config.clientUrl}/confirm-details/${data.id}`;
              messageService.sendMessage(req.body.From, msg);
          })
        });
    }
    res.status(200).end();
};
// Handle Outbound Callback message info
exports.outboundCallback = function (req, res) {
    const messageService = new MessageService();
    messageService.saveMessage('outbound', req.body);
    res.status(200).end();
};