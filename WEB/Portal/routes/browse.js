var express = require('express');
var router = express.Router();
var Config = require('./config');
const util = require('util');
const conf = new Config();
var azure = require('azure-storage');

/* GET home page. */
router.get('/', function (req, res) {
    var guid = req.query.guid;
    if (!guid) {
        res.render('browse', {
            title: 'Browse Photos'
        });
    } else {
        var tableSvc = azure.createTableService(conf.storageAccount, conf.accountKey, conf.storageAccount + ".table." + conf.host);
        tableSvc.retrieveEntity(conf.taskTable, guid.substring(0, 3).toLowerCase(), guid, function (error, result, response) {
            if (!error) {
                res.jsonp(result);
            }
        });
    }
});

router.post('/', function (req, res) {
    var token = req.body.token;
    var tableSvc = azure.createTableService(conf.storageAccount, conf.accountKey, conf.storageAccount + ".table." + conf.host);
    var query = new azure.TableQuery().top(conf.pageSize);
    rt = new Object();
    if (token != null) {
        token = token.replace(/&#34;/ig, '"');
        token = JSON.parse(token);
        if (token == null) { // emtry string passed in as token --> last page
            rt.token = null;
            rt.result = null;
            res.jsonp(rt);
            return;
        }
    }
    tableSvc.queryEntities(conf.taskTable, query, token, function (error, result, response) {
        rt.token = result != null ? result.continuationToken : {};
        rt.result = result != null ? result.entries : [];
        res.jsonp(rt);
    });

});

module.exports = router;