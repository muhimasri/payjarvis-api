const IncomingForm = require('formidable').IncomingForm;
const fs = require('fs');
const mime = require('mime-types');
const TicketService = require('../services/ticketService');
const Ticket = require('../models/ticketModel');
var moment = require('moment');

// Handle index actions
exports.index = (req, res) => {
    Ticket.find((err, tickets) => {
        if (err) {
            res.json({
                status: "error",
                message: err,
            });
        }
        res.json({
            status: "success",
            message: "tickets retrieved successfully",
            data: tickets
        });
    });
};

// Handle create ticket actions
exports.new = function (req, res) {
    const ticketService = new TicketService();
    const form = new IncomingForm();
    let s3Params = {};

    form.on('file', (field, file) => {
        fileContent = fs.readFileSync(file.path);
        const mimeType = mime.contentType(file.type);
        const ext = file.name.split('.')[file.name.split('.').length - 1];
        s3Params = {
            Bucket: 'livecords-dev',
            Key: Date.now().toString() + '.' + ext,
            Body: fileContent,
            ContentType: mimeType,
            ACL: 'public-read'
        };
    })
    form.on('end', () => {
        new Promise(resolve => {
            resolve(ticketService.processTicket(s3Params))
        }).then(data => {
            return res.json({
                message: 'File Uploaded Successfully',
                data: {
                    administrativePenaltyAmount: formatNumber(data.administrativePenaltyAmount),
                    dateOfViolation: data.dateOfViolation,
                    imageUrl: data.imageUrl,
                    plateNumber: data.plateNumber,
                    violationNoticeNumber: data.violationNoticeNumber,
                    ticketId: data.id
                }
            });
        })
    })
    form.parse(req);
};
// Handle view ticket info
exports.view = function (req, res) {
    Ticket.findById(req.params.ticketId, function (err, ticket) {
        moment()
        if (err)
            res.send(err);
        res.json({
            success: 'ticket details loading..',
            data: {
                administrativePenaltyAmount: formatNumber(ticket.administrativePenaltyAmount),
                dateOfViolation: ticket.dateOfViolation,
                imageUrl: ticket.imageUrl,
                plateNumber: ticket.plateNumber,
                violationNoticeNumber: ticket.violationNoticeNumber,
                ticketId: ticket._id,
                email: '',
                isPaid: ticket.isPaid,
                paidDate: ticket.paymentDetails ? moment(new Date(ticket.paymentDetails.created * 1000))
                .format('MMMM Do YYYY') : null,
                paidAmount: ticket.paymentDetails ? Number(ticket.paymentDetails.amount/100).toFixed(2) : null,
                userId: ticket.userId
            }
        });
    });
};

function formatNumber(amount) {
    if (!isNaN(Number(amount))) {
        return Number(amount).toFixed(2);
    }
    return 0;
}
// // Handle update ticket info
exports.update = function (req, res) {
    const info = {
        administrativePenaltyAmount: true,
        dateOfViolation: true,
        plateNumber: true,
        violationNoticeNumber: true
    }
    const updateObj = {};
    for (const key in req.body) {
        if (req.body[key] !== null && typeof req.body[key] !== 'undefined' && info[key]) {
            updateObj[key] = req.body[key];
        }
    }
    Ticket.findByIdAndUpdate(req.params.ticketId, {$set: updateObj}, {new:true},
        function(err,ticket){

        if (err)
                res.json(err);
            res.json({
                message: 'ticket Info updated',
                data: { administrativePenaltyAmount: ticket.administrativePenaltyAmount,
                    dateOfViolation: ticket.dateOfViolation,
                    imageUrl: ticket.imageUrl,
                    plateNumber: ticket.plateNumber,
                    violationNoticeNumber: ticket.violationNoticeNumber,
                    ticketId: ticket._id,
                    email: '',
                    isPaid: false
                    }
            });
    });
};

exports.updatePayment = (ticketId) => {
    Ticket.findByIdAndUpdate(ticketId, {$set: {isPaid: true}}, {new:true},
        function(err,doc){

        if (err)
                res.json(err);
            res.json({
                message: 'ticket Info updated',
                data: doc
            });
    });
}