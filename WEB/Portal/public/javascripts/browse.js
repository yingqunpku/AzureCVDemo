$(function () {

    lightbox.option({
        'resizeDuration': 200,
        'fadeDuration': 200,
        'imageFadeDuration': 200
    });

    $('.end').click(function () {
        window.scrollTo(0, 0);
    });


    var masonryNode = $('#album');
    masonryNode.imagesLoaded(function () {
        masonryNode.masonry({
            itemSelector: '.grid-item',
        });
    });
    var intervals = new Object();
    var imagesLoading = true;
    var token = null;
    var sorting = null;

    function sortByTime(a, b) {
        var an = a.getAttribute("data-datetime"),
            bn = b.getAttribute("data-datetime");
        if (an > bn) return -1;
        if (an < bn) return 1;
        return 0;
    }

    function sortByAccuracy(a, b) {
        var an = parseInt(a.getAttribute("data-accuracy")),
            bn = parseInt(b.getAttribute("data-accuracy"));
        if (an > bn) return -1;
        if (an < bn) return 1;
        return 0;
    }

    function sortByFaces(a, b) {
        var an = parseInt(a.getAttribute("data-faces")),
            bn = parseInt(b.getAttribute("data-faces"));
        if (an > bn) return -1;
        if (an < bn) return 1;
        return 0;
    }

    function sortNodes() {
        if (sorting == null) return;
        var elems = masonryNode.find('li');
        elems.sort(sorting);
        elems.detach();
        for (var i = 0; i < elems.length; i++) {
            masonryNode.append(elems[i]);
        }
        masonryNode.masonry('reloadItems');
        masonryNode.imagesLoaded(function () {
            masonryNode.masonry({
                itemSelector: '.grid-item',
            });
        });
    }

    $('#btnSortByAccuracy').click(function () {
        sorting = sortByAccuracy;
        sortNodes();
    });
    $('#btnSortByTime').click(function () {
        sorting = sortByTime;
        sortNodes();
    });
    $('#btnSortByFaces').click(function () {
        sorting = sortByFaces;
        sortNodes();
    });

    $("#key").bind('mouseover', function () {
        $(this).select();
    });

    $('#key').change(function () {
        $(this).select();
        var key = $(this).val().toLowerCase();
        var elems = masonryNode.find('li');
        elems.detach();
        for (var i = 0; i < elems.length; i++) {
            var classification = ', ' + elems[i].getAttribute('data-classification').toLowerCase() + ',';
            if (classification.indexOf(", " + key + ",") > -1) {
                elems[i].setAttribute('style', 'box-shadow: 2px 4px 4px 4px rgba(180, 100, 30, 0.5);border-radius: 3px;');
                masonryNode.prepend(elems[i]);

            } else {
                elems[i].setAttribute('style', '');
                masonryNode.append(elems[i]);
            }
        }
        masonryNode.masonry('reloadItems');
        masonryNode.imagesLoaded(function () {
            masonryNode.masonry({
                itemSelector: '.grid-item',
            });
        });
    });

    function checkStatus(RK, sleep = 1000) {
        $.ajax({
            type: "get",
            async: true,
            url: "/browse",
            dataType: "jsonp",
            data: {
                "guid": RK
            },
            jsonp: "callback",
            success: function (element) {
                if (element && element.RowKey && element.RowKey._ == RK) {
                    var item = createNode(element);
                    node = $("[data-RK='" + RK + "']");
                    node.html(item.html());
                    addRemoveListner(node, element);
                    node.attr("data-faces", item.attr("data-faces"));
                    node.attr("data-classification", item.attr("data-classification"));
                    node.attr("data-accuracy", item.attr("data-accuracy"));
                    masonryNode.masonry('reloadItems');
                    masonryNode.imagesLoaded(function () {
                        masonryNode.masonry({
                            itemSelector: '.grid-item',
                        });
                    });
                    if (!element.classification || !element.thumbnail || !element.faces) {
                        if (sleep > 10000) sleep = 10000;
                        setTimeout(function () {
                            checkStatus(RK);
                        }, sleep * 1.2);
                    }
                }
            },
            error: function () {
                console.log("ERRR");
            }

        });
    }


    function processClassification(node, element) {
        var dom = node.find(".raw-link");
        dom.attr("data-title", element.classification ? element.classification._ : "");
        dom = node.find(".classification");
        if (element.classification) {
            dom.attr("style", "background:rgba(0, 88, 12, " + parseFloat(element.accuracy._) / 100 + ")!important;")
            var html = "";
            var classes = element.classification._.split(',');
            for (var i in classes) {
                var c = classes[i].trim();
                html += "<a href='#' onclick=\"$('#key').val('" + c + "');$('#key').change();\" title='Search for \"" + c + "\"'>" +
                    c + "</a>";
                if (i < classes.length - 1) {
                    html += ", ";
                }
            }
            dom.html(html);
            dom = node.find("[role='progressbar']");
            dom.attr("aria-valuenow", element.accuracy._);
            dom.attr("style", "width: " + element.accuracy._ + "%;background: rgba(0, 88, 12, " + parseFloat(element.accuracy._) / 100 + ")!important;");
            dom.text(element.accuracy._ + "%");
            node.attr("data-classification", element.classification._);
            node.attr("data-accuracy", element.accuracy._);
        } else {
            dom.text("Processing...");
            dom = node.find(".progress");
            dom.hide();
        }
    }

    function processThumbnail(node, element) {
        node.find(".thumbnail-img").attr("src", element.thumbnail ? element.thumbnail._ : element.raw._);
    }

    function processFace(node, element) {
        var dom = node.find(".face-link");
        if (element.faces && element.faces._ > 0) {
            node.attr("data-faces", element.faces._);
            dom.attr("href", element.facedetect._);
            dom.attr("data-lightbox", element.raw._);
            dom.attr("data-title", element.faces._ + " face" + (element.faces._ > 1 ? "s" : "") + " detected");
            var facetemplate = $("#template .smile-image")
            for (var i = 0; i < element.faces._; i++) {
                dom.append(facetemplate.clone());
            }
        } else {
            dom.hide();
            node.attr("data-faces", 0);
        }
    }

    function addRemoveListner(node, element) {
        node.find('.glyphicon-trash').click(function () {
            $.ajax({
                type: "post",
                async: true,
                url: "/delete",
                dataType: "jsonp",
                data: {
                    "RK": element.RowKey._,
                    "PK": element.PartitionKey._
                },
                jsonp: "callback",
                success: function (json) {
                    if (json && json.result) {
                        node.remove();
                        masonryNode.masonry('reloadItems');
                        masonryNode.imagesLoaded(function () {
                            masonryNode.masonry({
                                itemSelector: '.grid-item',
                            });
                        });
                    }
                }
            });
        });
    }


    function createNode(element) {
        if (!element.raw) return;
        var node = $("#template li").clone();
        addRemoveListner(node, element);
        var dom = node.find(".raw-link");
        dom.attr("href", element.raw._);
        dom.attr("data-lightbox", element.raw._);
        node.attr("data-datetime", element.Timestamp._);
        node.attr("data-RK", element.RowKey._);
        processClassification(node, element);
        processThumbnail(node, element);
        processFace(node, element);
        return node;
    }

    $.ajax({
        type: "post",
        async: false,
        url: "/browse",
        dataType: "jsonp",
        jsonp: "callback",
        success: function (json) {
            token = json.token;
            if (Array.isArray(json.result)) {
                json.result.forEach(function (element) {
                    var node = createNode(element);
                    if (!element.classification || !element.thumbnail || !element.faces) {
                        setTimeout(function () {
                            checkStatus(element.RowKey._);
                        }, 1000);
                    }
                    if (node) {
                        masonryNode.append(node); //.masonry('appended', node).masonry();
                        node.imagesLoaded(function () {
                            masonryNode.masonry({
                                itemSelector: '.grid-item',
                            });
                        });
                    }
                }, this);
            }
            $(".loader").hide();
            imagesLoading = false;
        }
    });

    $(window).scroll(function () {
        // console.log($(document).height() - $(window).height() - $(document).scrollTop());
        if ($(document).height() - $(window).height() - $(document).scrollTop() < 10) {
            if (!imagesLoading) {
                $(".loader").show();
                imagesLoading = true;
                $.ajax({
                    type: "post",
                    async: true,
                    url: "/browse",
                    dataType: "jsonp",
                    data: {
                        "token": JSON.stringify(token)
                    },
                    jsonp: "callback",
                    success: function (json) {
                        token = json.token;
                        if (Array.isArray(json.result)) {
                            if (token == null) {
                                $(window).unbind("scroll")
                                $('.end').removeClass('hide');
                            }
                            json.result.forEach(function (element) {
                                var node = createNode(element);
                                if (!element.classification || !element.thumbnail || !element.faces) {
                                    setTimeout(function () {
                                        checkStatus(element.RowKey._);
                                    }, 1000);
                                }
                                if (node) {
                                    masonryNode.append(node);
                                    node.imagesLoaded(function () {
                                        masonryNode.masonry('appended', node);
                                    });
                                }
                            }, this);
                            setTimeout(function () {
                                imagesLoading = false;
                            }, 600);
                        } else { // stop listening to scroll event
                            $(window).unbind("scroll");
                            $('.end').removeClass('hide');
                        }
                        $(".loader").hide();
                    }
                });
            }
        }
    });
});