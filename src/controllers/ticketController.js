// ticketController.js
// Import ticket model
Ticket = require('../models/ticketModel');
User = require('../models/userModel');
// Handle index actions
// exports.index = function (req, res) {
//     ticket.get(function (err, tickets) {
//         if (err) {
//             res.json({
//                 status: "error",
//                 message: err,
//             });
//         }
//         res.json({
//             status: "success",
//             message: "tickets retrieved successfully",
//             data: tickets
//         });
//     });
// };

const IncomingForm = require('formidable').IncomingForm;
const fs = require('fs');
const mime = require('mime-types');
const AWS = require('aws-sdk');

async function s3Upload(params) {
    const s3 = new AWS.S3({
        // accessKeyId: process.env.AWS_ACCESS_KEY,
        // secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        accessKeyId: 'AKIAIOEJLUFH6IQ5H66A',
        secretAccessKey: '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'
    });
    return new Promise(resolve => {
        s3.upload(params, function (s3Err, data) {
            if (s3Err) {
                resolve(s3Err);
            } else {
                resolve(data)
            }
        })
    });
}

async function documentExtract(content) {
    return new Promise(resolve => {
        var textract = new AWS.Textract({
            region: 'us-west-2',
            endpoint: 'https://textract.us-west-2.amazonaws.com/',
            accessKeyId: 'AKIAIOEJLUFH6IQ5H66A',
            secretAccessKey: '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'
        });
        var params = {
            Document: {
                // Bytes: Buffer.from(fileContent) // || 'STRING_VALUE' /* Strings will be Base-64 encoded on your behalf */,
                S3Object: {
                    Bucket: 'livecords-dev',
                    Name: content.Key
                }
            },
            FeatureTypes: ['FORMS', 'TABLES']
        };

        textract.analyzeDocument(params, function (err, data) {
            if (err) {
                return resolve(err);
            } else {
                let ticketInfo = new Ticket();
                let rawData = data.Blocks.map(item => item.Text);
                try {
                    ticketInfo.dateOfViolation = rawData[14];
                    ticketInfo.violationNoticeNumber = rawData[7];
                    ticketInfo.plateNumber = rawData[20];
                    ticketInfo.administrativePenaltyAmount = rawData[35];
                    ticketInfo.imageUrl = content.Location;
                    ticketInfo.rawData = rawData
                } catch (err) {
                    // ticketInfo = {};
                }
                resolve(ticketInfo);
            }
        });
    });
}

async function saveTicket(ticketInfo) {
    return new Promise(resolve => {
        ticketInfo.save((err, res) => {
            resolve(res);
        })
    });
}

async function saveUser(phone) {
    return new Promise(resolve => {
        const newUser = new User();
        if (phone !== null && typeof phone !== 'undefined') {
            newUser.phone = phone;
        }
        newUser.save((err, res) => {
            resolve(res.id);
        })
    });
}

async function processTicket(s3Params, phone) {
    const s3Content = await s3Upload(s3Params);
    const documentContent = await documentExtract(s3Content);
    documentContent.userId = await saveUser(phone);
    return await saveTicket(documentContent);
}

exports.createTicket = async function (s3Params, phone) {
    const s3Content = await s3Upload(s3Params);
    const documentContent = await documentExtract(s3Content);
    documentContent.userId = await saveUser(phone);
    return await saveTicket(documentContent);
}

// Handle create ticket actions
exports.new = function (req, res) {
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
            resolve(processTicket(s3Params))
        }).then(data => {
            return res.json({
                message: 'File Uploaded Successfully',
                data: {
                    administrativePenaltyAmount: data.administrativePenaltyAmount,
                    dateOfViolation: data.dateOfViolation,
                    imageUrl: data.imageUrl,
                    plateNumber: data.plateNumber,
                    violationNoticeNumber: data.violationNoticeNumber,
                    ticketId: data._id
                }
            });
        })
    })
    form.parse(req);
    // ticket.name = req.body.name ? req.body.name : ticket.name;

    // save the ticket and check for errors
    // ticket.save(function (err) {
    //     // Check for validation error
    //     if (err)
    //         res.json(err);
    //     else
    //         res.json({
    //             message: 'New ticket created!',
    //             data: ticket
    //         });
    // });
};
// Handle view ticket info
exports.view = function (req, res) {
    Ticket.findById(req.params.ticketId, function (err, ticket) {
        if (err)
            res.send(err);
        res.json({
            message: 'ticket details loading..',
            data: {
                administrativePenaltyAmount: ticket.administrativePenaltyAmount,
                dateOfViolation: ticket.dateOfViolation,
                imageUrl: ticket.imageUrl,
                plateNumber: ticket.plateNumber,
                violationNoticeNumber: ticket.violationNoticeNumber,
                ticketId: ticket._id,
                email: '',
                isPaid: ticket.isPaid
            }
        });
    });
};
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
// // Handle delete ticket
// exports.delete = function (req, res) {
//     ticket.remove({
//         _id: req.params.ticket_id
//     }, function (err, ticket) {
//         if (err)
//             res.send(err);
//         res.json({
//             status: "success",
//             message: 'ticket deleted'
//         });
//     });
// };