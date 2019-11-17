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
        type: Number,
        default: 0
    },
    addressSearchFee: {
        type: Number,
        default: 0
    },
    lateFee: {
        type: Number,
        default: 0
    },
    processingFee: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    imageUrl: {
        type: String,
        default: ''
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    ocr: {
        type: Object,
        default: {}
    },
    paymentDetails: {
        type: Object,
        default: {}
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