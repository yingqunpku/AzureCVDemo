var express = require('express');
var router = express.Router();

var Config = require('./config');
const conf = new Config();
var azure = require('azure-storage');
const util = require('util');


function getDataFromTableRetriveResult(error, result, field, defaultValue) {
    var rt = defaultValue;
    if (!error && result && result[field]) {
        rt = result[field]._;
    }
    return rt;
}

function getAverageServerLatencyTableRetriveResult(error, result) {
    return getDataFromTableRetriveResult(error, result, "AverageServerLatency", 0);
}



/* GET home page. */
router.all('/', function (req, res) {
    var tableSvc = azure.createTableService(conf.storageAccount, conf.accountKey, conf.storageAccount + ".table." + conf.host);
    var maxDelay = 10; //minutes
    var now = new Date();
    var PK = null;
    var counter = 0;
    var retrievePK = function (error, result, response) {
        if (result == null) {
            if (counter == maxDelay) {
                res.json(null);
            }
            now.setMinutes(now.getMinutes() - 1);
            PK = now.toISOString().replace(/-|:/ig, '').substring(0, 13);
            counter++;
            tableSvc.retrieveEntity(conf.storageAnalyticsTableMetricsTable, PK, "system;All", retrievePK);
        } else {
            tableSvc.retrieveEntity(conf.storageAnalyticsTableMetricsTable, PK, "user;All", function (error, result, response) {
                tableLat = getAverageServerLatencyTableRetriveResult(error, result);
                tableSvc.retrieveEntity(conf.storageAnalyticsBlobMetricsTable, PK, "user;All", function (error, result, response) {
                    blobLat = getAverageServerLatencyTableRetriveResult(error, result);
                    tableSvc.retrieveEntity(conf.storageAnalyticsQueueMetricsTable, PK, "user;All", function (error, result, response) {
                        queueLat = getAverageServerLatencyTableRetriveResult(error, result);
                        var rt = {};
                        if (queueLat > 0) rt['QueueLat'] = queueLat;
                        if (blobLat > 0) rt['BlobLat'] = blobLat;
                        if (tableLat > 0) rt['TableLat'] = tableLat;
                        res.json(rt);
                    });
                });
            });
        }
    };
    retrievePK(1, null, res);
});

module.exports = router;