var Config = require('./config');
const conf = new Config();
var azure = require('azure-storage');
const util = require('util');

function Task() {
    this.blobSvc = azure.createBlobService(conf.storageAccount, conf.accountKey, conf.storageAccount + ".blob." + conf.host);
    this.tableSvc = azure.createTableService(conf.storageAccount, conf.accountKey, conf.storageAccount + ".table." + conf.host);
    this.entityGenerator = azure.TableUtilities.entityGenerator;
}

Task.prototype.deleteBlobIfExists = function (container, url) {
    var top = this;
    if (url && url.trim()) {
        var path = conf.storageAccount + ".blob." + conf.host + "/" + container + "/";
        if (url.indexOf("http://" + path) == 0 || url.indexOf("https://" + path) == 0) {
            var blob = url.replace("http://" + path, '').replace("https://" + path, '');
            top.blobSvc.deleteBlob(container, blob, function (error, response) {
                if (!error) {
                    top.incrementMetric(-1, conf.metricBlobCountRK);
                }
            });
        }
    }
};

Task.prototype.deleteTask = function (PK, RK) {
    var top = this;
    if (PK == null || RK == null) {
        top.incrementMetric(-1, conf.metricTaskCountRK);
    } else {
        top.tableSvc.retrieveEntity(conf.taskTable, PK, RK, function (error, result, response) {
            if (!error) {
                if (result.raw) top.deleteBlobIfExists(PK, result.raw._);
                if (result.facedetect) top.deleteBlobIfExists(PK, result.facedetect._);
                if (result.thumbnail) top.deleteBlobIfExists(PK, result.thumbnail._);
                var task = {
                    PartitionKey: top.entityGenerator.String(PK),
                    RowKey: top.entityGenerator.String(RK)
                };
                top.tableSvc.deleteEntity(conf.taskTable, task, function (error, response) {
                    if (!error) top.incrementMetric(-1, conf.metricTaskCountRK);
                });
            }
        });
    }
}

Task.prototype.doincre = function (delta, entity, cnt, RK) {
    console.log("TRY " + cnt.toString());
    var top = this;
    // if (cnt <= 0) return; // avoid infinite recusion
    var item = {
        PartitionKey: top.entityGenerator.String(conf.metricTablePK),
        RowKey: top.entityGenerator.String(RK),
        value: top.entityGenerator.Int64(parseInt(entity.value._) + delta),
        ".metadata": {
            "etag": entity['.metadata'].etag
        }
    };
    top.tableSvc.mergeEntity(conf.metricTable, item, function (error, result, response) {
        if (error) {
            top.tableSvc.retrieveEntity(conf.metricTable, conf.metricTablePK, RK, function (error, result, response) {
                if (!error) {
                    top.doincre(delta, result, parseInt(cnt) + 1, RK);
                }
            });
        }
    });
};

Task.prototype.incrementMetric = function (delta, RK) {
    var top = this;
    top.tableSvc.createTableIfNotExists(conf.metricTable, function (error, response) {
        if (!error) {
            top.tableSvc.retrieveEntity(conf.metricTable, conf.metricTablePK, RK, function (error, result, response) {
                if (!error) {
                    top.doincre(delta, result, 1, RK);
                } else {
                    var item = {
                        PartitionKey: top.entityGenerator.String(conf.metricTablePK),
                        RowKey: top.entityGenerator.String(RK),
                        value: top.entityGenerator.Int64(delta > 0 ? delta : 0)
                    };
                    top.tableSvc.insertEntity(conf.metricTable, item, function (error, result, response) {
                        if (error) {
                            top.tableSvc.retrieveEntity(conf.metricTable, conf.metricTablePK, RK, function (error, result, response) {
                                if (!error) {
                                    top.doincre(delta, result, 1, RK);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
};

Task.prototype.createTask = function (RK, uri, callback) {
    var top = this;
    var PK = RK.substring(0, 3).toLowerCase();
    top.blobSvc.createContainerIfNotExists(PK, {
        publicAccessLevel: 'blob'
    }, function (error, result, response) {});

    top.tableSvc.createTableIfNotExists(conf.taskTable, function (error, response) {
        var task = {
            PartitionKey: top.entityGenerator.String(PK),
            RowKey: top.entityGenerator.String(RK),
            raw: top.entityGenerator.String(uri)
        };
        top.tableSvc.insertOrReplaceEntity(conf.taskTable, task, function (error, result, response) {
            if (!error) {
                top.incrementMetric(1, conf.metricTaskCountRK);
            }
            callback();
        });
    });
};

module.exports = Task;