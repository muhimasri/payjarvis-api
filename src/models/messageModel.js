// messageModel.js
const mongoose = require('mongoose');
// Setup schema
const messageSchema = mongoose.Schema({
    type: {
        type: String,
        default: ''
    },
    details: {
        type: Object,
        default: {}
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});
// Export message model
module.exports = mongoose.model('message', messageSchema);