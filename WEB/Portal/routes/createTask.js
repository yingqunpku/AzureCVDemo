var multiparty = require("multiparty");
var express = require('express');
var azure = require('azure-storage');
var router = express.Router();
const util = require('util');
var Config = require('./config');
var Task = require('./task');
var TaskMsg = require('./taskmsg');
const uuid = require('node-uuid');
const conf = new Config();


router.all('/', function (req, res) {
    var uri = req.body.uri;
    var RK = req.body.RK;
    var task = new Task();
    if (!RK) RK = uuid.v4();
    else { // from SAS upload
        task.incrementMetric(1, conf.metricBlobCountRK);
    }
    //TODO: check container == session account
    /*
        var indexOfQueryStart = uri.indexOf("?");
        if (indexOfQueryStart > -1) { //remove query string
            uri = uri.substring(0, indexOfQueryStart);
        }
        var lastSlash = uri.lastIndexOf("/");
        if (lastSlash > -1) {
            RK = uri.substring(lastSlash + 1);
        }
        console.log("BLOB:" + blob);
        if (blob != 'true') { // from URI
            RK = uuid.v4() + RK;
            console.log("RK = " + RK);
        }
        console.log(RK);
    */
    task.createTask(RK, uri, function () {
        var taskmsg = new TaskMsg(RK, uri, function () {
            var rt = {
                "uri": uri,
                "RK": RK
            };
            res.jsonp(rt);
        });
    });
});

module.exports = router;