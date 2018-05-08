import "adapterjs"

// Assumes that the socket is already connected

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