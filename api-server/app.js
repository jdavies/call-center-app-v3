let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let fileUpload = require ('express-fileupload');
let cors = require('cors');


let indexRouter = require('./routes/index');
let usersRouter = require('./routes/users');
let filesRouter = require('./routes/files');
let recordingsRouter = require('./routes/recordings');

let app = express();
app.use(cors());
app.use(fileUpload({
  createParentPath: true,
  limits: {
    fileSize: 20 * 1024 * 1024 * 1024 //20 MB max file(s) size
  },
}));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/files', filesRouter);
app.use('/recordings', recordingsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
