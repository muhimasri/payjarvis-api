// messageController.js
// Import message model
const Message = require('../models/messageModel');
const MessageService = require('../services/messageService');

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
    res.status(200).end();
};
// Handle Outbound Callback message info
exports.outboundCallback = function (req, res) {
    const messageService = new MessageService();
    messageService.saveMessage('outbound', req.body);
    res.status(200).end();
};