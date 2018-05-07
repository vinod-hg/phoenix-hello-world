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
import "phoenix_html"
import "adapterjs"

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

import socket from "./socket"
window.socket = socket

/* <script src="<%= static_path(@conn, "/js/codemirror/addon/edit/matchbrackets.js") %>"></script>

<script src="<%= static_path(@conn, "/js/codemirror/addon/hint/show-hint.js") %>"></script>
<script src="<%= static_path(@conn, "/js/codemirror/addon/selection/active-line.js") %>"></script>
<script src="<%= static_path(@conn, "/js/codemirror/mode/clike/clike.js") %>"></script> */

let localStream, peerConnection;
let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");
let connectButton = document.getElementById("connect");
let callButton = document.getElementById("call");
let hangupButton = document.getElementById("hangup");

hangupButton.disabled = true;
callButton.disabled = true;
connectButton.onclick = connect;
callButton.onclick = call;
hangupButton.onclick = hangup;

// To use Phoenix channels, the first step is to import Socket
// and connect at the socket path in "lib/web/endpoint.ex":
socket.connect();

// Now that you are connected, you can join channels with a topic:
var channel = socket.channel("room:" + room, {user: user});

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


chatInput.addEventListener("keypress", function (event) {
  if (event.keyCode === 13) {
    channel.push("new_msg", { body: chatInput.value });
    chatInput.value = "";
  }
});

var userMarkers = {};
// Receive new message from channel
channel.on("new_msg", function (payload) {
  // if (payload.user == null || payload.user == user) {
  //   console.log("received from same user: " + payload.user);
  //   return;
  // }
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
    alert(payload.body.origin)
  }
});

channel.join().receive("ok", function (resp) {
  console.log("Joined successfully", resp);
}).receive("error", function (resp) {
  console.log("Unable to join", resp);
});


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
  channel.push("new_msg", {user: user, body: changeObj})
});
console.log("*** Marking text *** ");
  console.log("*** Marked text *** ");
var selected = false;
var selectFrom;
var selectTo;
editor.on("cursorActivity", function(cm) {
  if (cm.somethingSelected()) {
    selected = true;
    var selFrom = cm.getCursor("from");
    if(selectFrom != null && selFrom.line != selectFrom.line && selFrom.ch != selectFrom.ch) {
    log(selFrom);
    log(selectFrom);  
      console.log("-- removed selection due to another select?--- ");
      channel.push("new_msg", {user: user, body: {origin: "unselect", from: selectFrom, to: selectTo}});
    }
    selectFrom = selFrom;
    selectTo = cm.getCursor("to");
    console.log("--selected--- ");
    channel.push("new_msg", {user: user, body: {origin: "select", from: selectFrom, to: selectTo}})
  } else if (selected) {
    console.log("-- removed selection--- ");
    selected = false;
    channel.push("new_msg", {user: user, body: {origin: "unselect", from: selectFrom, to: selectTo}})
    selectFrom = selectTo = null
  }
});

function log(object) {
  var output = '';
  for (var property in object) {
    output += property + ":" + object[property] +'; ';
  }
  console.log("----- " + output +" ------");
}
// let channel = socket.channel("call", {})
// channel.join()
//   .receive("ok", () => { console.log("Successfully joined call channel") })
//   .receive("error", () => { console.log("Unable to join") })


function connect() {
  console.log("Requesting local video stream to display in browser");
  navigator.getUserMedia({video:true}, gotVideoStream, error => {
    console.log("getUserMedia error: ", error);
  });
  console.log("Requesting local audio video stream for sending to remote");
  navigator.getUserMedia({audio:true, video:true}, gotAudioVideoStream, error => {
    console.log("getUserMedia error: ", error);
  });
}

function gotVideoStream(stream) {
  console.log("Received local video stream to display in browser");
  localVideo.src = URL.createObjectURL(stream);
}

function gotAudioVideoStream(stream) {
  console.log("Received local audio video stream for sending to remote");
  localStream = stream;
  setupPeerConnection();
}

function setupPeerConnection() {
  connectButton.disabled = true;
  callButton.disabled = false;
  hangupButton.disabled = false;
  console.log("Waiting for call");

  let servers = {
    "iceServers": [{
      "url": "stun:stun.example.org"
    }]
  };

  peerConnection = new RTCPeerConnection(servers);
  console.log("Created local peer connection");
  peerConnection.onicecandidate = gotLocalIceCandidate;
  peerConnection.onaddstream = gotRemoteStream;
  peerConnection.addStream(localStream);
  console.log("Added localStream to localPeerConnection");
}

function call() {
  callButton.disabled = true;
  console.log("Starting call");
  peerConnection.createOffer(gotLocalDescription, handleError);
}

function gotLocalDescription(description){
  peerConnection.setLocalDescription(description, () => {
    channel.push("message", { body: JSON.stringify({
      "sdp": peerConnection.localDescription
    })});
  }, handleError);
  console.log("Offer from localPeerConnection: \n" + description.sdp);
}

function gotRemoteDescription(description){
  console.log("Answer from remotePeerConnection: \n" + description.sdp);
  peerConnection.setRemoteDescription(new RTCSessionDescription(description.sdp));
  peerConnection.createAnswer(gotLocalDescription, handleError);
}

function gotRemoteStream(event) {
  remoteVideo.src = URL.createObjectURL(event.stream);
  console.log("Received remote stream");
}

function gotLocalIceCandidate(event) {
  if (event.candidate) {
    console.log("Local ICE candidate: \n" + event.candidate.candidate);
    channel.push("message", {body: JSON.stringify({
      "candidate": event.candidate
    })});
  }
}

function gotRemoteIceCandidate(event) {
  callButton.disabled = true;
  if (event.candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
    console.log("Remote ICE candidate: \n " + event.candidate.candidate);
  }
}

channel.on("message", payload => {
  let message = JSON.parse(payload.body);
  if (message.sdp) {
    gotRemoteDescription(message);
  } else {
    gotRemoteIceCandidate(message);
  }
})

function hangup() {
  console.log("Ending call");
  peerConnection.close();
  localVideo.src = null;
  peerConnection = null;
  hangupButton.disabled = true;
  connectButton.disabled = false;
  callButton.disabled = true;
}

function handleError(error) {
  console.log(error.name + ": " + error.message);
}