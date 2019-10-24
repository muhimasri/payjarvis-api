// ticketModel.js
const mongoose = require('mongoose');
// Setup schema
const ticketSchema = mongoose.Schema({
    dateOfViolation: {
        type: String,
        default: ''
    },
    violationNoticeNumber: {
        type: String,
        default: ''
    },
    plateNumber: {
        type: String,
        default: ''
    },
    administrativePenaltyAmount: {
        type: String,
        default: ''
    },
    imageUrl: {
        type: String,
        default: ''
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    rawData: {
        type: Array,
        default: []
    },
    userId: {
        type: String,
        default: ''
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});
// Export ticket model
const ticket = module.exports = mongoose.model('ticket', ticketSchema);
module.exports.get = function (callback, limit) {
    ticket.find(callback).limit(limit);
}