let express = require('express');
let recordingService = require('../lib/recordings');
let router = express.Router();



/* GET list of recordings sent in the last 15 minutes. */
router.get('/', function(req, res, next) {

    recordingService.getTranscriptions(req, res, next);

});

module.exports = router;
