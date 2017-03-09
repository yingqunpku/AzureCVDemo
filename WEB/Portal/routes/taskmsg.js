var Config = require('./config');
const conf = new Config();
var azure = require('azure-storage');


function TaskMsg(RK, uri, callback) {
    var queueSvc = azure.createQueueService(conf.storageAccount, conf.accountKey, conf.storageAccount + ".queue." + conf.host);
    queueSvc.createQueueIfNotExists(conf.taskQueue, function (error, response) {
        if (!error) {
            queueSvc.createMessage(conf.taskQueue, RK + "(^_^)" + uri, function (error) {
                callback();
            });
        }else{
            callback();
        }
    });
}
module.exports = TaskMsg;