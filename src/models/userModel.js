// userModel.js
const mongoose = require('mongoose');
// Setup schema
const userSchema = mongoose.Schema({
    email: {
        type: String,
        default: null
    },
    phone: {
        type: String,
        default: null
    },
    subscribed: {
        type: Boolean,
        default: false
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});
// Export user model
module.exports = mongoose.model('user', userSchema);