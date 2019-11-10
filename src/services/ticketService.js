const Ticket = require('../models/ticketModel');
const User = require('../models/userModel');
const AWS = require('aws-sdk');
const config = require('config');
const moment = require('moment');
const Quagga = require('quagga').default;

class TicketService {
    constructor() {};

    async s3Upload(params) {
        const s3 = new AWS.S3({
            accessKeyId: config.aws.accessKey,
            secretAccessKey: config.aws.secretAccessKey,
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

    async saveUser(phone) {
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

    async processTicket(s3Params, phone) {
        const s3Content = await this.s3Upload(s3Params);
        const documentContent = await this.documentExtract(s3Content);
        documentContent.userId = await this.saveUser(phone);
        return await this.saveTicket(documentContent);
    }

    async saveTicket(ticketInfo) {
        return new Promise(resolve => {
            ticketInfo.save((err, res) => {
                resolve(res);
            })
        });
    }

    async documentExtract(content) {
        return new Promise(resolve => {
            var textract = new AWS.Textract({
                region: config.aws.region,
                endpoint: 'https://textract.us-west-2.amazonaws.com/',
                accessKeyId: config.aws.accessKey,
                secretAccessKey: config.aws.secretAccessKey
            });
            var params = {
                Document: {
                    // Bytes: Buffer.from(fileContent) // || 'STRING_VALUE' /* Strings will be Base-64 encoded on your behalf */,
                    S3Object: {
                        Bucket: config.aws.bucket,
                        Name: content.Key
                    }
                },
                FeatureTypes: ['FORMS']
            };

            textract.analyzeDocument(params, (err, data) => {
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
                        const {
                            key_map,
                            value_map,
                            block_map
                        } = this.get_kv_map(data.Blocks);

                        // Get Key Value relationship
                        const formData = this.get_kv_relationship(key_map, value_map, block_map)
                        // const startList = data.Blocks.filter(
                        //     item => item.Geometry.BoundingBox.Left > 0.5 &&
                        //     item.Geometry.BoundingBox.Top < 0.11 &&
                        //     item.BlockType == 'LINE');
                       
                        new Promise(resolve => {
                            resolve(this.createTicketData(formData, content, ticketInfo));
                        }).then(()=> {
                            ticketInfo.ocr = {
                                formData,
                                rawData
                            };
                            resolve(ticketInfo);
                        })
                    } catch (err) {

                    }
                }
            });
        });
    }

    async createTicketData(formData, content, ticketInfo) {
        try {
            const noticeNumber = await new Promise(resolve => {
                Quagga.decodeSingle({
                    src: content.Location,
                    numOfWorkers: 0,  // Needs to be 0 when used within node
                    inputStream: {
                        size: 800  // restrict input-size to be 800px in width (long-side)
                    },
                    decoder: {
                        readers: ["code_39_reader"] // List of active readers
                    },
                    locate: true
                }, (result) => {
                    resolve(result);
                });
            });
            if(noticeNumber.codeResult) {
                ticketInfo.violationNoticeNumber = noticeNumber.codeResult.code;
            } else {
                ticketInfo.violationNoticeNumber = '';
            }
        } catch (err) {
            ticketInfo.violationNoticeNumber = '';
        }
        try {
            ticketInfo.dateOfViolation = this.searchValue(formData, 'date of violation').trim();
            const fDate = moment(ticketInfo.dateOfViolation, 'YYYY.MM.DD').format('L');
            if (fDate === 'Invalid date') {
                ticketInfo.dateOfViolation = moment(new Date()).format('L');
            } else {
                ticketInfo.dateOfViolation = fDate;
            }
        } catch (err) {
            ticketInfo.dateOfViolation = moment(new Date()).format('L');
        }
        try {
            ticketInfo.plateNumber = this.searchValue(formData, 'plate').trim();
        } catch (err) {
            ticketInfo.plateNumber = '';
        }
        try {
            ticketInfo.administrativePenaltyAmount = this.searchValue(formData, 'amount').trim().replace('$', '');
            if (isNaN(ticketInfo.administrativePenaltyAmount)) {
                if (ticketInfo.administrativePenaltyAmount.indexOf('50')) {
                    ticketInfo.administrativePenaltyAmount = 50;
                } else {
                    ticketInfo.administrativePenaltyAmount = 30;
                }
            }
        } catch (err) {
            ticketInfo.administrativePenaltyAmount = 30;
        }
        try {
            ticketInfo.imageUrl = content.Location;
        } catch (err) {
            ticketInfo.imageUrl = '';
        }
    }

    searchValue(form, word) {
        for (const key in form) {
            if (key.toLowerCase().indexOf(word) > -1) {
                return form[key];
            }
        }
        return '';
    }

    get_kv_map(blocks) {
        // get key and value maps
        const key_map = {};
        const value_map = {};
        const block_map = {};
        for (const block of blocks) {
            const block_id = block['Id'];
            block_map[block_id] = block;
            if (block['BlockType'] == "KEY_VALUE_SET") {
                if (block['EntityTypes'].includes('KEY'))
                    key_map[block_id] = block;
                else
                    value_map[block_id] = block;
            }
        }
        return {
            key_map,
            value_map,
            block_map
        };
    }

    get_kv_relationship(key_map, value_map, block_map) {
        const kvs = {}
        for (const key_block in key_map) {
            const value_block = this.find_value_block(key_map[key_block], value_map)
            let key = this.get_text(key_map[key_block], block_map)
            const val = this.get_text(value_block, block_map)
            if (key.indexOf('.') > -1) {
                key = key.split('.').join('');
            }
            kvs[key] = val;
        }
        return kvs
    }

    get_text(result, blocks_map) {
        let text = '';
        if (result['Relationships']) {
            for (const relationship of result['Relationships']) {
                if (relationship['Type'] == 'CHILD') {
                    for (const child_id of relationship['Ids']) {
                        const word = blocks_map[child_id]
                        if (word['BlockType'] == 'WORD') {
                            text = text + word['Text'] + ' ';
                        }
                        if (word['BlockType'] == 'SELECTION_ELEMENT') {
                            if (word['SelectionStatus'] == 'SELECTED') {
                                text = text + 'X ';
                            }
                        }
                    }
                }
            }
        }
        return text
    }

    find_value_block(key_block, value_map) {
        try {
            let value_block = null;
            for (const relationship of key_block['Relationships']) {
                if (relationship['Type'] == 'VALUE') {
                    for (const value_id of relationship['Ids']) {
                        value_block = value_map[value_id];
                    }
                }
            }
            return value_block;
        } catch(err) {
            console.error(err);
        }
    }
}

module.exports = TicketService;