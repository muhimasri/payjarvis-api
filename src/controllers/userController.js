// userController.js
// Import user model
User = require('../models/userModel');
// Handle index actions
exports.index = function (req, res) {
    user.get(function (err, users) {
        if (err) {
            res.json({
                status: "error",
                message: err,
            });
        }
        res.json({
            status: "success",
            message: "users retrieved successfully",
            data: users
        });
    });
};

const IncomingForm = require('formidable').IncomingForm;
const fs = require('fs');

const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    // accessKeyId: process.env.AWS_ACCESS_KEY,
    // secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    accessKeyId: 'AKIAIOEJLUFH6IQ5H66A',
    secretAccessKey: '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'
});

// Handle create user actions
exports.new = function (req, res) {
    var form = new IncomingForm()

    form.on('file', (field, file) => {
        AWS.config.region = 'us-west-2';
        AWS.config.endpoint = 'https://textract.us-west-2.amazonaws.com/';
        // AWS.config.s3BucketEndpoint = true;
        AWS.config.accessKeyId = 'AKIAIOEJLUFH6IQ5H66A';
        AWS.config.secretAccessKey = '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';

        const fileContent = fs.readFileSync(file.path);
        // const mimeType = mime.contentType(file.type); 
        var textract = new AWS.Textract();
        // const r = new textract.
        var params = {
            Document: { /* required */
            // Bytes: Buffer.from(fileContent) // || 'STRING_VALUE' /* Strings will be Base-64 encoded on your behalf */,
              S3Object: {
                Bucket: 'livecords-dev',
                Name: '1570996347334.png'
                // Version: 'STRING_VALUE'
              }
            },
            FeatureTypes: [ 'FORMS', 'TABLES' ]
        };

        textract.analyzeDocument(params, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data.Blocks[0]);           // successful response
        });
        // const params = {
        //     Bucket: 'livecords-dev',
        //     Key: Date.now().toString() + '.png',
        //     Body: fileContent,
        //     ContentType: mimeType,
        //     ACL: 'public-read'
        // };
        // s3.upload(params, function(s3Err, data) {
        //     if (s3Err) throw s3Err
        //     console.log(`File uploaded successfully at ${data.Location}`);
        // });
    })
    form.on('end', () => {
        res.json()
    })
    form.parse(req)
    var user = new User();
    user.name = req.body.name ? req.body.name : user.name;
    return res.json({
        message: 'user details loading..',
        data: user
    });
// save the user and check for errors
    // user.save(function (err) {
    //     // Check for validation error
    //     if (err)
    //         res.json(err);
    //     else
    //         res.json({
    //             message: 'New user created!',
    //             data: user
    //         });
    // });
};
// Handle view user info
exports.view = function (req, res) {
    user.findById(req.params.user_id, function (err, user) {
        if (err)
            res.send(err);
        res.json({
            message: 'user details loading..',
            data: user
        });
    });
};
// Handle update user info
exports.update = function (req, res) {
    user.findById(req.params.user_id, function (err, user) {
        if (err)
            res.send(err);
        user.name = req.body.name ? req.body.name : user.name;
// save the user and check for errors
        user.save(function (err) {
            if (err)
                res.json(err);
            res.json({
                message: 'user Info updated',
                data: user
            });
        });
    });
};
// Handle delete user
exports.delete = function (req, res) {
    user.remove({
        _id: req.params.user_id
    }, function (err, user) {
        if (err)
            res.send(err);
        res.json({
            status: "success",
            message: 'user deleted'
        });
    });
};