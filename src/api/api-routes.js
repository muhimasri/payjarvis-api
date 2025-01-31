// api-routes.js
// Initialize express router
let router = require('express').Router();
// Set default API response
router.get('/', function (req, res) {
    res.json({
        status: 'API Its Working',
        message: 'Welcome to RESTHub crafted with love!',
    });
});
// Import user controller
const userController = require('../controllers/userController');
// user routes
router.route('/users')
    .get(userController.index)
    .post(userController.new);

router.route('/users/:userId')
    .get(userController.view)
    .patch(userController.update)
    .put(userController.update)
    .delete(userController.delete);

// Import ticket controller
const ticketController = require('../controllers/ticketController');
// ticket routes
router.route('/tickets')
    // .get(ticketController.index)
    .post(ticketController.new);

router.route('/tickets/:ticketId')
    .get(ticketController.view)
    .patch(ticketController.update)
    .put(ticketController.update)
    // .delete(ticketController.delete);


// Import message controller
const messageController = require('../controllers/messageController');
// message routes
router.route('/messages/inbound/request')
    .post(messageController.inboundRequest);

router.route('/messages/outbound/callback')
    .post(messageController.outboundCallback);


// Export API routes
module.exports = router;