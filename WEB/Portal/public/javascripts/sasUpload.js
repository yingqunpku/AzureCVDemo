var maxBlockSize = 256 * 1024; //Each file will be split in 256 KB.
var numberOfBlocks = 1;
var selectedFile = null;
var currentFilePointer = 0;
var totalBytesRemaining = 0;
var blockIds = new Array();
var blockIdPrefix = "block-";
var submitUri = null;
var bytesUploaded = 0;
var blobUri = null;
var RowKey = null;

$(document).ready(function () {
    $("#file").bind('change', handleFileSelect);
    $("#uri").bind('keyup', handleUriChange);
    $("#uris").bind('keyup', handleUrisChange);
    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
        alert('The File APIs are not fully supported in this browser. Please create tasks from URI.');
    }
});

/**
 * When URI input changes, prepare to create task
 */
function handleUrisChange(e) {
    var uris = $("#uris").val().trim();
    if (uris == '') {
        msg("");
    } else {
        progress(0);
        msg("Click <button class=\"btn btn-xs btn-primary\" id=\"btnCreatetaskwithuri\">Create Task</button> to create a task from the URIs", "info");
        $("#btnCreatetaskwithuri").click(function () {
            var uris = $("#uris").val().trim();
            createTaskFromURIs(uris);
        });
    }
}

/**
 * When URI input changes, prepare to create task
 */
function handleUriChange(e) {
    var uri = $("#uri").val().trim();
    if (uri == '') {
        msg("");
    } else {
        progress(0);
        msg("Click <button class=\"btn btn-xs btn-primary\" id=\"btnCreatetaskwithuri\">Create Task</button> to create a task from URI: \"" + uri + "\"", "info");
        $("#btnCreatetaskwithuri").click(function () {
            var uri = $("#uri").val().trim();
            createTaskFromURI(uri);
        });
    }
}

function createTaskFromURIs(uris) {
    var arrayURI = uris.split("\n");
    arrayURI.forEach(function (uri) {
        createTaskFromURI(uri.trim());
    }, this);
}

/**
 * Create a image processing task based on URI of orginal image
 * uri: URI of orginal image, could be a blob newly created
 * RK: rowkey of the task. If RK != null, it indicates creation from upload a file into blob.
 * 
 */
function createTaskFromURI(uri, RK = null) {
    if (uri != '') {
        msg("Creating task from URI " + uri, "info");
        $.ajax({
            type: "post",
            async: true,
            url: "/createTask",
            dataType: "jsonp",
            jsonp: "callback",
            data: {
                "uri": uri,
                "RK": RK
            },
            success: function (json) {
                if (json && json.uri) {
                    // $("#btnUpload").hide();
                    // $('#btnCreatetaskwithuri').hide();
                    document.forms['theform'].reset();
                    msg("Task created. Click <a href=\"" + json.uri + "\" target=\"_blank\">" + json.uri + "</a> to view the original image file.", "success");
                } else {
                    handleFailure("Task creation failed.", RK != null);
                }
            },
            error: function (err, str) {
                handleFailure("Task creation failed.", RK != null);
            }
        });
    }
}

/**
 * When task creation or file upload failed, show message and remove uploaded file if necessary.
 * deleteBlobOnFailure: shall delete "submitUri"? default = true
 */
function handleFailure(str = "Task creation failed.", deleteBlobOnFailure = true) {
    if (deleteBlobOnFailure) {
        deleteBlob(submitUri);
    }
    msg(str, "danger");
}

/**
 * Show message
 * type: default(gray), primary(blue), success(green), info(lightblue), warning(orange), danger(red)
 */
function msg(content, type = "default") {
    var node = $("#msg");
    node.removeClass("label-default");
    node.removeClass("label-primary");
    node.removeClass("label-success");
    node.removeClass("label-info");
    node.removeClass("label-warning");
    node.removeClass("label-danger");
    node.addClass("label-" + type);
    node.html(content);
}

/**
 * Show upload progress
 * number: 0-100
 */
function progress(number) {
    var node = $("#fileUploadProgress");
    node.text(number + " %");
    node.attr("aria-valuenow", number);
    node.attr("style", "width:" + number + "%");
}

/**
 * Read the file and find out how many blocks we would need to split it.
 */
function handleFileSelect(e) {
    blockIds = new Array();
    maxBlockSize = 256 * 1024;
    bytesUploaded = 0;
    currentFilePointer = 0;
    totalBytesRemaining = 0;
    var files = e.target.files;
    selectedFile = files[0];
    progress(0);
    if ("image" != selectedFile.type.substring(0, 5)) { // file type verification
        msg(selectedFile.type + " not supported. Image files only.", "warning");
        $("#output").hide();
    } else { // image file
        msg("Creating SAS URI ...");
        $.ajax({
            type: "post",
            async: true,
            url: "/sas",
            dataType: "jsonp",
            jsonp: "callback",
            success: function (json) {
                if (json && json.sas && json.sas.uri) {
                    msg("Click <button class=\"btn btn-xs btn-primary\" type=\"button\" id=\"btnUpload\">Upload file</button> to start uploading from \"" + selectedFile.name + "\"", "info");
                    $("#btnUpload").click(function () {
                        msg("Uploading with SAS ...", "info");
                        uploadFileInBlocks();
                    });
                    $("#output").removeClass("hide");
                    $("#output").show();
                    var fileSize = selectedFile.size;
                    if (fileSize < maxBlockSize) {
                        maxBlockSize = fileSize;
                    }
                    totalBytesRemaining = fileSize;
                    if (fileSize % maxBlockSize == 0) {
                        numberOfBlocks = fileSize / maxBlockSize;
                    } else {
                        numberOfBlocks = parseInt(fileSize / maxBlockSize, 10) + 1;
                    }
                    var baseUrl = json.sas.uri;
                    var indexOfQueryStart = baseUrl.indexOf("?");
                    var indexOfDot = selectedFile.name.indexOf(".");
                    var ext = "";
                    if (indexOfDot > -1) {
                        ext = selectedFile.name.substring(indexOfDot);
                    }
                    RowKey = json.guid;
                    blobUri = baseUrl.substring(0, indexOfQueryStart) + '/' + json.guid + ext;
                    submitUri = blobUri + baseUrl.substring(indexOfQueryStart);
                    console.log(submitUri);
                } else {
                    handleFailure("SAS creation failed.");
                }
            },
            error: function (err, str) {
                handleFailure("SAS creation failed.");
            }
        });
    }
}


var reader = new FileReader();
reader.onloadend = function (evt) {
    if (evt.target.readyState == FileReader.DONE) { // DONE == 2
        var uri = submitUri + '&comp=block&blockid=' + blockIds[blockIds.length - 1];
        var requestData = new Uint8Array(evt.target.result);
        $.ajax({
            url: uri,
            type: "PUT",
            data: requestData,
            processData: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
            },
            success: function (data, status) {
                bytesUploaded += requestData.length;
                var percentComplete = ((parseFloat(bytesUploaded) / parseFloat(selectedFile.size)) * 100).toFixed(2);
                progress(percentComplete);
                uploadFileInBlocks();
            },
            error: function (xhr, desc, err) {
                handleFailure("File upload failed.");
            }
        });
    }
};

function uploadFileInBlocks() {

    if (totalBytesRemaining > 0) {
        var fileContent = selectedFile.slice(currentFilePointer, currentFilePointer + maxBlockSize);
        var blockId = blockIdPrefix + pad(blockIds.length, 6);
        blockIds.push(btoa(blockId));
        reader.readAsArrayBuffer(fileContent);
        currentFilePointer += maxBlockSize;
        totalBytesRemaining -= maxBlockSize;
        if (totalBytesRemaining < maxBlockSize) {
            maxBlockSize = totalBytesRemaining;
        }
    } else {
        commitBlockList();
    }
}

function commitBlockList() {
    var uri = submitUri + '&comp=blocklist';
    var requestBody = '<?xml version="1.0" encoding="utf-8"?><BlockList>';
    for (var i = 0; i < blockIds.length; i++) {
        requestBody += '<Latest>' + blockIds[i] + '</Latest>';
    }
    requestBody += '</BlockList>';
    $.ajax({
        url: uri,
        type: "PUT",
        data: requestBody,
        beforeSend: function (xhr) {
            xhr.setRequestHeader('x-ms-blob-content-type', selectedFile.type);
        },
        success: function (data, status) {
            msg("File upload successfully to <a href='" + blobUri + "' target='_blank'>this blob</a>. Creating task ... ", "primary");
            createTaskFromURI(blobUri, RowKey);
        },
        error: function (xhr, desc, err) {
            handleFailure("File upload failed");
        }
    });
}

function pad(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}

/**
 * Delete a blob via SAS
 */
function deleteBlob(sasUri) {
    if (sasUri) {
        $.ajax({
            url: sasUri,
            type: "DELETE",
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
            },
            success: function (data, status) {
                $.ajax({
                    url: '/delete',
                    type: "GET",
                    success: function (data, status) {},
                    error: function (xhr, desc, err) {}
                });
                console.log("Blob deleted: " + sasUri);
            },
            error: function (xhr, desc, err) {
                console.log("Blob deletion failed: " + sasUri);
            }
        });
    }
}