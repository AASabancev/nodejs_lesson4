var express = require('express');
var path = require('path');
var router = express.Router();


router.post('/', function(req, res, next) {
   res.json({
      text: "hello"
   });
});


module.exports = router;
