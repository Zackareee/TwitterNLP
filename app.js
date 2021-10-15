var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

//Natural
var stemmer = require('natural').PorterStemmer;
var natural = require('natural');
var Analyzer = require('natural').SentimentAnalyzer;


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var twitterRouter = require('./routes/twitter');

var app = express();

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
app.use('/twitter',twitterRouter);






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

var tokenizer = new natural.WordTokenizer();
var analyzer = new Analyzer("English", stemmer, "afinn");



// getSentiment expects an array of strings
let sentence = `We’re making progress in the fight against COVID-19.
 
Daily cases are down 47% and hospitalizations are down 38%, case rates are declining in 39 states, and we’re down to 66 million unvaccinated people.
 
We’re in a critical period as we work to turn a corner on COVID-19.`;

let words = sentence.split(" ");
//tokenizer doenst work

console.log(words)

console.log(analyzer.getSentiment(words));


 




module.exports = app;
