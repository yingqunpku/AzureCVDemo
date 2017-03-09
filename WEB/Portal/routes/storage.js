var express = require('express');
var router = express.Router();

var Config = require('./config');
const conf = new Config();
var azure = require('azure-storage');
const util = require('util');


/* GET home page. */
router.all('/', function (req, res) {
    var tableSvc = azure.createTableService(conf.storageAccount, conf.accountKey, conf.storageAccount + ".table." + conf.host);
    var queueSvc = azure.createQueueService(conf.storageAccount, conf.accountKey, conf.storageAccount + ".queue." + conf.host);
    tableSvc.retrieveEntity(conf.metricTable, conf.metricTablePK, conf.metricBlobCountRK, function (error, result, response) {
        var blobs = "0";
        if (!error && result) {
            blobs = result.value._;
        }
        tableSvc.retrieveEntity(conf.metricTable, conf.metricTablePK, conf.metricTaskCountRK, function (error, result, response) {
            var tasks = "0";
            if (!error && result) {
                tasks = result.value._;
            }
            queueSvc.getQueueMetadata(conf.taskQueue, function (error, result, response) {
                var messages = 0;
                if (!error && result) {
                    messages = result.approximateMessageCount;
                }
                res.json({
                    "tasks": tasks,
                    "blobs": blobs,
                    "processed": (parseInt(tasks) - messages).toString(),
                    "messages": messages.toString()
                });
            });
        });
    });
});

module.exports = router;