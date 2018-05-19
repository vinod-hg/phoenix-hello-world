// Brunch automatically concatenates all files in your
// watched paths. Those paths can be configured at
// config.paths.watched in "brunch-config.js".
//
// However, those files will only be executed if
// explicitly imported. The only exception are files
// in vendor, which are never wrapped in imports and
// therefore are always executed.

// Import dependencies
//
// If you no longer want to use a dependency, remember
// to also remove its path from "config.paths.watched".
// import jQuery from "jquery"
//import "phoenix_html"
import "phoenix"
import {Socket, LongPoll} from "phoenix"

//import "priv/static/js/codemirror"
// import "codemirror/mode/javascript/javascript.js"
import CodeMirror from "codemirror/lib/codemirror.js"
import "codemirror/addon/edit/matchbrackets.js"
import "codemirror/addon/hint/show-hint.js"
import "codemirror/addon/selection/active-line.js"
import "codemirror/mode/clike/clike.js"

// Import local files
//
// Local files can be imported directly using relative
// paths "./socket" or full ones "web/static/js/socket".

// To use Phoenix channels, the first step is to import Socket
// import socket from "./socket"
// window.socket = socket

export class RoomChannel {
  get chan() {
     return this._chan;
  }
  set chan(value) { 
    console.log("")
    this._chan = value;
  }
}
let socket = new Socket("/socket", {params: {token: window.userToken}})
var channel = new RoomChannel()

let retry_count = 0
socket.onError(error => {
    console.log(error, retry_count)
    if (retry_count == 2) {
        socket.disconnect()
        console.log("connecting with longpoll")
        socket = new Socket("/socket", {transport: LongPoll, params: {token: window.userToken}})
        socket.onOpen(onSocketOpen)
        var resp = socket.connect()
        console.log(resp)
    }
    retry_count++
})
socket.onOpen(onSocketOpen)
var resp = socket.connect()

function onSocketOpen() {
  console.log("Socket connected successfully")
  // Now that you are connected, you can join channels with a topic:
  channel.chan = socket.channel("room:" + room, {user: user});
  channel.chan.on("new_msg", channelNewMsg);
  channel.chan.on("user:new", channelUserNew);
  channel.chan.on("user:left", channelUserLeft);
  channel.chan.on("msg:new", channelAddMessage);
  channel.chan.on("users", channelUsers);

  channel.chan.join().receive("ok", function (resp) {
    console.log("Joined successfully", resp);
  }).receive("error", function (resp) {
    console.log("Unable to join", resp);
  });
}

function channelUserNew(payload) {
  addUser(payload.user);
}
function channelUserLeft(payload) {
  $('#' + payload.user).remove();
}
function channelUsers(payload) {
  $('#users').empty();
  for (var i in payload.users) {
    addUser(payload.users[i]);
  }
}

function addUser(user) {
  $('#users').append(
    '<div class="item" id='+ user +'>\
      <div class="header">\
        <a class="description userlist">' + user + '</a>\
      </div>\
    </div>');
  $('#users').animate({scrollTop: $('#users').prop("scrollHeight")}, 1);
}

function channelAddMessage(payload) {
  var dt = new Date(payload.time);
  var time = dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();
  $('#msgs').append(
    '<div class="comment">\
    <div class="content">\
      <a class="author">'+ payload.user +'</a>\
      <div class="metadata">\
        <span class="date">'+ time +'</span>\
      </div>\
      <div class="text">'+ payload.msg +'</div>\
    </div>\
  </div>');
  $('#msgs').animate({scrollTop: $('#msgs').prop("scrollHeight")}, 1);
}

$('.ui.chat.button').on('click', function () {
  sendMsg();
})

$('.ui.fluid.action.input').on('keypress', function (event) {
  if (event.shiftKey === false && event.keyCode === 13) {
    sendMsg();
  }
})

function sendMsg() {
  var msg = { user: user, time: new Date(), msg: $('#chatinput').val() };
  channel.chan.push("msg:new", msg);
  $('#chatinput').val('');
  channelAddMessage(msg);
}

var chatInput = document.querySelector("#chat-input");
var messagesContainer = document.querySelector("#messages");
var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
  //dragDrop: false,
  styleActiveLine: true,
  styleSelectedText: true,
  lineNumbers: true,
  extraKeys: {"Ctrl-Space": "autocomplete"},
  mode: "text/x-csrc"
});


// chatInput.addEventListener("keypress", function (event) {
//   if (event.keyCode === 13) {
//     channel.chan.push("new_msg", { body: chatInput.value });
//     chatInput.value = "";
//   }
// });

var prevcounter=0;
var userMarkers = {};
// Receive new message from channel
function channelNewMsg(payload) {
  // if (payload.user == null || payload.user == user) {
  //   console.log("received from same user: " + payload.user);
  //   return;
  // }
  //if (payload.counter != prevcounter + 1) {
    console.log("received payload: " + payload);
    var output = '';
    var entry = payload;
    for (var property in entry) {
      output += property + ":" + entry[property] + '; ';
    }
    output += "---";
    var entry = payload.body;
    for (var property in entry) {
      output += property + ":" + entry[property] + '; ';
    }
    console.log(output);
  //}
  prevcounter = payload.counter
  switch(payload.body.origin) {
  case "+input":
  case "+delete":
  case "paste":
  case "undo":
  case "cut":
  case "drag":
    editor.replaceRange(payload.body.text, payload.body.from, payload.body.to);
    break;
  case "select":
    if (userMarkers[payload.user] != null) {
      userMarkers[payload.user].clear();
    }
    userMarkers[payload.user] = editor.getDoc().markText({line: payload.body.from.line, ch: payload.body.from.ch}, 
                                    {line: payload.body.to.line, ch: payload.body.to.ch}, {css: "background : yellow"});
    break;
  case "unselect":
    userMarkers[payload.user].clear();
    break;
  default:
    console.log("Received unknown origin" + payload.body.origin);
    alert("Received unknown origin" + payload.body.origin)
  }
}

var counter = 0;
// On editor change
editor.on("change", function(cm, changeObj) {
  if (changeObj["origin"] == null) {
    return;
  }
  var output = '';
  for (var property in changeObj) {
    output += property + ":" + changeObj[property] +'; ';
  }
  console.log("----- " + output +" ------");
  counter++;
  channel.chan.push("new_msg", {user: user, counter: counter, body: changeObj})
});
console.log("*** Marking text *** ");
  console.log("*** Marked text *** ");
var selected = false;
var selectFrom;
var selectTo;
editor.on("cursorActivity", function(cm) {
  if (cm.somethingSelected()) {
    counter++;
    selected = true;
    var selFrom = cm.getCursor("from");
    if(selectFrom != null && selFrom.line != selectFrom.line && selFrom.ch != selectFrom.ch) {
    log(selFrom);
    log(selectFrom);  
      console.log("-- removed selection due to another select?--- ");
      channel.chan.push("new_msg", {user: user, counter: counter,
        body: {origin: "unselect", from: selectFrom, to: selectTo}});
    }
    selectFrom = selFrom;
    selectTo = cm.getCursor("to");
    console.log("--selected--- ");
    channel.chan.push("new_msg", {user: user, counter: counter,
      body: {origin: "select", from: selectFrom, to: selectTo}})
  } else if (selected) {
    counter++;
    console.log("-- removed selection--- ");
    selected = false;
    channel.chan.push("new_msg", {user: user, counter: counter,
      body: {origin: "unselect", from: selectFrom, to: selectTo}})
    selectFrom = selectTo = null
  }
});


function log(object) {
  var output = '';
  for (var property in object) {
    output += property + ":" + object[property] +'; ';
  }
  console.log("----- " + output +" ------");
  return output;
}
