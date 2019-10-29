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
            FeatureTypes: ['FORMS']
        };

        textract.analyzeDocument(params, function (err, data) {
            if (err) {
                return resolve(err);
            } else {
                let ticketInfo = new Ticket();
                let rawData = data.Blocks.map(item => {
                    if (item.BlockType.toLowerCase() === 'line' && item.Text !== null) {
                        return item.Text;
                    }
                });
                try {
                    const {key_map, value_map, block_map} = get_kv_map(data.Blocks);

                    // Get Key Value relationship
                    const formData = get_kv_relationship(key_map, value_map, block_map)
                    const startList = data.Blocks.filter(
                        item => item.Geometry.BoundingBox.Left > 0.5
                        && item.Geometry.BoundingBox.Top < 0.11
                        && item.BlockType == 'LINE');
                    ticketInfo.violationNoticeNumber = startList[startList.length-1].Text;
                    ticketInfo.dateOfViolation = searchValue(formData, 'date of violation');
                    ticketInfo.plateNumber = searchValue(formData, 'plate');
                    ticketInfo.administrativePenaltyAmount = searchValue(formData, 'amount');
                    ticketInfo.imageUrl = content.Location;
                    ticketInfo.ocr = {formData, rawData};
                } catch (err) {
                    // ticketInfo = {};
                }
                resolve(ticketInfo);
            }
        });
    });
}

function searchValue(form, word) {
    for (const key in form) {
        if (key.toLowerCase().indexOf(word) > -1) {
            return form[key];
        }
    }
    return '';
}

function get_kv_map(blocks) {
    // get key and value maps
    const key_map = {};
    const value_map = {};
    const block_map = {};
    for (const block of blocks){
        const block_id = block['Id'];
        block_map[block_id] = block;
        if (block['BlockType'] == "KEY_VALUE_SET") {
            if (block['EntityTypes'].includes('KEY'))
                key_map[block_id] = block;
            else
                value_map[block_id] = block;
            }
    }
    return {key_map, value_map, block_map};
}

function get_kv_relationship(key_map, value_map, block_map) {
    const kvs = {}
    for (const key_block in key_map) {
        const value_block = find_value_block(key_map[key_block], value_map)
        let key = get_text(key_map[key_block], block_map)
        const val = get_text(value_block, block_map)
        if (key.indexOf('.') > -1) {
            key = key.split('.').join('');
        }
        kvs[key] = val;
    }
    return kvs
}

function get_text(result, blocks_map) {
    let text = '';
    if (result['Relationships']) {
        for (const relationship of result['Relationships']){
            if (relationship['Type'] == 'CHILD') {
                for (const child_id of relationship['Ids']) {
                    const word = blocks_map[child_id]
                    if (word['BlockType'] == 'WORD') {
                        text = text + word['Text'] + ' ';
                    }
                    if (word['BlockType'] == 'SELECTION_ELEMENT') {
                        if (word['SelectionStatus'] == 'SELECTED'){
                            text = text + 'X ';
                        }
                    }
                }
            }
        }
    }
    return text
}

function find_value_block(key_block, value_map) {
    for (const relationship of key_block['Relationships']) {
        if (relationship['Type'] == 'VALUE') {
            for (const value_id of relationship['Ids']) {
                value_block = value_map[value_id];
            }
        }
    }
    return value_block
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