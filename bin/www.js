#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require('../app');
var debug = require('debug')('lesson-04-backend:server');
var http = require('http');
const path = require("path");
require('dotenv').config();

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Create Socket server.
 */

const ChatMessage = require( path.join(process.cwd(), 'models','ChatMessage.js') );
var io = require('socket.io')(server, {
  allowEIO3: true, // false by default
  'transports': ['websocket', 'polling']
});

app.set('socketio', io);

let clients = [];

io.sockets.on('connection',(socket) => {

   // console.log(' %s sockets is connected', clients.length); // this is not printing

  // socket
  //    .emit({
  //     type: 'users:connect',
  //     message: clients
  //   });



  socket.on('users:connect', (msg) => {

     // Необходимо создать объект пользователя и сохранить в нем socketId сокета,
     // userId пользователя и имя пользователя, как свойства,
     // обновить общий объект,
     let client = {
        username: msg.username,
        socketId: socket.id,
        userId: msg.userId,
        activeRoom: null
     };

     clients.push(client);

     // и отправить его, в виде массива, только что подключившемуся пользователю (с помощью события users:list).
     socket.emit('users:list', clients);


    //  // Разослать всем подключенным сокетам объект нового пользователя (с помощью события users:add).
    socket.broadcast.emit('users:add', client);
    // io.emit('users:add', clients[socket.id]);
  });

   socket.on('message:add', (msg) => {

      ChatMessage.create(msg);

      // Нужно передать пользователю-получателю в параметрах текст сообщения (text) и senderId отправителя и recipientId получателя с помощью события message:add.
      const recipient = clients.filter((client) => {
         return client.userId === msg.recipientId;
      }).shift();

      if(recipient) {
         socket.to(recipient.socketId).emit('message:add', {
            text: msg.text,
            senderId: msg.senderId,
            recipientId: msg.recipientId,
         });
      }

      socket.emit('message:add', {
         text: msg.text,
         senderId: msg.senderId,
         recipientId: msg.recipientId,
      });

   });


   socket.on('message:history', (msg) => {
      // Нужно вернуть пользователю список сообщений диалога с выбранным пользователем.
      // Параметры:
      // recipientId - id пользователя-получателя (чат с которым мы открыли),
      // userId - id пользователя (свой).
      //
      // Список сообщений диалога отправить с помощью события message:history.


      ChatMessage.find({
         $or: [
            {recipientId:msg.recipientId,senderId:msg.userId},
            {senderId:msg.recipientId,recipientId:msg.userId},
         ]
      })
         .then(function(messages){
            socket.emit('message:history', messages);
         })
         .catch(function(err){
            console.log('ERROR HISTORY', err);
         });

   });

  socket.on('disconnect', () => {

      // Нужно передать всем подключенным пользователям socketId отключившегося пользователя (с помощью события users:leave),
     io.emit('users:leave', socket.id);

     // и удалить пользователя из объекта всех подключенных пользователей.
     clients = clients.filter( client => {
        return client.socketId !== socket.id;
     });

  });


  });

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
