const MessageModel = require('../models/messageModel');

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
}

module.exports = MessageService;