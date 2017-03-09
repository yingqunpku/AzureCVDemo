var express = require('express');
var router = express.Router();

/* GET home page. */
router.all('/', function (req, res) {
    res.render('index', { title: 'Upload Photos'});
});

module.exports = router;