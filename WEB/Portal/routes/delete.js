var multiparty = require("multiparty");
var express = require('express');
var azure = require('azure-storage');
var router = express.Router();
const util = require('util');
var Config = require('./config');
var Task = require('./task');
const uuid = require('node-uuid');
const conf = new Config();

router.all('/', function (req, res) {
    var task = new Task();
    task.deleteTask(req.body.PK, req.body.RK);
    res.jsonp({
        "result": "ok"
    });
});

module.exports = router;