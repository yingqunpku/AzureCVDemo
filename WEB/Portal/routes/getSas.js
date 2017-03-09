var multiparty = require("multiparty");
var express = require('express');
var azure = require('azure-storage');
var router = express.Router();
const util = require('util');
var Config = require('./config');
const uuid = require('node-uuid');
const conf = new Config();

/**
 * 
$context = New-AzureStorageContext -StorageAccountName  cvimg1 -StorageAccountKey  "nJS111"
$a = $context | New-AzureStorageContainerSASToken -Container "004" -Permission rwdl -ExpiryTime "2017-02-28T00:00:00Z"
 */

function generateSasToken(container, blobService) {

    // Create a SAS token that expires in an hour
    // Set start time to five minutes ago to avoid clock skew.
    var startDate = new Date();
    startDate.setDate(startDate.getDate() - 1 );
    var expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 1);
    var sharedAccessPolicy = {
        AccessPolicy: {
            Permissions: azure.BlobUtilities.SharedAccessPermissions.READ + azure.BlobUtilities.SharedAccessPermissions.WRITE + azure.BlobUtilities.SharedAccessPermissions.DELETE,
            Start: startDate,
            Expiry: expiryDate
        }
    };
    var sasToken = blobService.generateSharedAccessSignature(container, null, sharedAccessPolicy);
    return {
        token: sasToken,
        uri: blobService.getUrl(container, null, sasToken)
    };
}

router.all('/', function (req, res) {
    var blobSvc = azure.createBlobService(conf.storageAccount, conf.accountKey, conf.storageAccount + ".blob." + conf.host);
    var guid = uuid.v4();

    var container = guid.substring(0, 3).toLowerCase();
    //TODO: use account name from session instead

    blobSvc.createContainerIfNotExists(container, {
        publicAccessLevel: 'blob'
    }, function (error, result, response) {
        if (!error) {
            var token = generateSasToken(container, blobSvc);
            var rt = {
                'guid': guid,
                'sas': token
            };
            res.jsonp(rt);
        } else {
            res.jsonp(error);
        }
    });
});


module.exports = router;