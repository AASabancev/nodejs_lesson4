var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();


const cors = require('cors');
const session = require("express-session")
const passport = require("passport")
const LocalStrategy = require("passport-local")
const passportJWT = require("passport-jwt")
const FileStore = require("session-file-store")(session)
const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

var apiUsersRouter = require('./routes/users');
var apiNewsRouter = require('./routes/news');
var apiRouter = require('./routes/api');
var apiSocketRouter = require('./routes/socket');

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.NODE_ENV=='production' ? process.env.DB_PRODUCTION : process.env.DB_DEVELOP)

const User = require( path.join(process.cwd(), 'models','User.js') );



var app = express();
app.use(cors());
app.use(session({
  store: new FileStore(),
  secret: 'secret',
  resave: false,
  saveUninitialized: true
}))
app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => {
  done(null, user._id)
})

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => done(err, user))
})

passport.use(new LocalStrategy({
  usernameField: "username",
}, (username, password, done) => {
  User.findOne({username: username}).then((user) => {

    if(!user){
      return done(null, false, {message: "Invalid username / password"})
    }

    user.comparePassword(password, (err, matched) => {
      if(err){
        throw err
      }
      if(matched) {
        return done(null, user)
      } else {
        return done(null, false, { message: "Invalid username / password" })
      }
    })
  })
}))

passport.use(new JWTStrategy({
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
  secretOrKey: "jwt_secret"
}, (jwt_paylod, done) => {

  User.findById(jwt_paylod.user._id, ( err, user ) => done(err, user))
}))


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//
app.use('/api/users', apiUsersRouter);
app.use('/api/news', apiNewsRouter);
app.use('/socket.io', apiSocketRouter);
app.use('/api', apiRouter);

let folder = "/public/build_local";
if(process.env.NODE_ENV=='production') {
  folder = "/public/build_heroku";
}
app.use(express.static(path.join(__dirname, folder)));
app.get("*", (req, res) => {
  return res.sendFile(path.join(__dirname + folder + "/index.html"))
})


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
  res.json({
    error: err.message,
    success: false
  });
});

module.exports = app;
