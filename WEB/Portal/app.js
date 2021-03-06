﻿var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var ejs = require('ejs');
var app = express();

// view engine setup
// use EJS with .html extension
app.engine('.html', ejs.__express);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');


// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/index'));
app.use('/sas', require('./routes/getSas'));
app.use('/storage', require('./routes/storage'));
app.use('/storageanalytics', require('./routes/storageanalytics'));
app.use('/createTask', require('./routes/createTask'));
app.use('/browse', require('./routes/browse'));
app.use('/delete', require('./routes/delete'));
app.use('/test', require('./routes/test'));


app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JQuery JS
app.use('/js', express.static(__dirname + '/node_modules/lightbox2/dist/js')); // redirect lightbox2
app.use('/js', express.static(__dirname + '/node_modules/masonry-layout/dist')); // redirect masonry-layout
app.use('/js', express.static(__dirname + '/node_modules/imagesloaded')); // redirect imagesloaded
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap
app.use('/css', express.static(__dirname + '/node_modules/lightbox2/dist/css')); // redirect CSS lightbox2

app.use('/images', express.static(__dirname + '/node_modules/lightbox2/dist/images')); // redirect CSS bootstrap
app.use('/fonts', express.static(__dirname + '/node_modules/bootstrap/dist/fonts')); // redirect CSS bootstrap 
app.use('/js', express.static(__dirname + '/node_modules/bootstrap-validator/dist')); // redirect bootstrap validator

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
			title: 'Error',
			code: err.status,
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
		title: 'Error',
		code: err.status,
        message: err.message,
        error: {}
    });
});

module.exports = app;
