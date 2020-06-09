import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { NgbTimepickerModule } from '@ng-bootstrap/ng-bootstrap';


const offerOptions: RTCOfferOptions = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

@Component({
  selector: 'app-video-chat',
  templateUrl: './video-chat.component.html',
  styleUrls: ['./video-chat.component.css']
})
export class VideoChatComponent implements OnInit {

  @ViewChild('localeVideo') localeVideo: ElementRef;
  @ViewChild('remoteVideo') remoteVideo: ElementRef;

  avatar: any;
  localstream: MediaStream;

  // websocket stuff
  websocketUrl = "ws://localhost:8001/socket"
  conn: WebSocket;
  peerConnection: RTCPeerConnection;
  dataChannel: RTCDataChannel;

  // call states
  callState: CallState = CallState.Aidle;



  constructor() { }

  ngOnInit(): void {
    // this.conn = new WebSocket('ws://' + location.hostname + (location.port ? ':' + location.port : '') + '/socket')
    this.conn = new WebSocket(this.websocketUrl);
    this.conn.onopen = (ev: Event) => this.onOpen(ev);
    this.conn.onmessage = (msg: MessageEvent) => this.onMessage(msg);
  }

  ngAfterViewInit() {
    console.log('vid1', this.localeVideo);
    console.log('vid2', this.remoteVideo);
  }

  onOpen(ev) {
    console.log("Connected to the signaling server", ev);
  };

  // on Message Recieved from WebSocket Server;
  onMessage(msg: MessageEvent) {
    console.log("Got message", msg.data);
    var content = JSON.parse(msg.data);
    var data = content.data;
    switch (content.event) {
      // when somebody wants to call us
      case "offer":
        this.handleOffer(data);
        break;
      case "answer":
        this.handleAnswer(data);
        break;
      // when a remote peer sends an ice candidate to us
      case "candidate":
        this.handleCandidate(data);
        break;
      case "call":
        this.handleCall(data);
        break;
      case "accept_call":
        this.handleAcceptCall(data);
        break;
      case "deny_call":
        this.handleDenyCall(data);
        break;
      default:
        break;
    }
  };


  initialize() {
    let configuration: RTCConfiguration = {
      iceServers: [
        { urls: "stun:23.21.150.121" },
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "turn:numb.viagenie.ca", "credential": "webrtcdemo", "username": "louis@mozilla.com" }
      ]
    }
    this.peerConnection = new RTCPeerConnection(configuration);
    console.log("peer Connection created", this.peerConnection);

    // Setup ice handling
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({
          event: "candidate",
          data: event.candidate
        });
      }
    };
    this.peerConnection.ontrack = (ev: RTCTrackEvent) => this.gotRemoteStream(ev);

  }

  initializingCall(): Promise<void> {
    // creating peer connection
    this.initialize();
    // Adding support for video
    const constraints = {
      video: true, audio: true
    };
    // requesting Media Devices 
    return navigator.mediaDevices.getUserMedia(constraints).
      then((stream) => {
        /* use the stream */
        //    stream.getTracks().forEach(track => pc1.addTrack(track, localStream));
        stream.getTracks().forEach(track => this.peerConnection.addTrack(track, stream));
        this.gotStream(stream);
      })
      .catch(function (err) {
        /* handle the error */
        console.log("error adding stream ", JSON.stringify(err));
      });
  }

  send(message) {
    console.log("sending message", JSON.stringify(message));
    this.conn.send(JSON.stringify(message));
  }


  createOffer() {
    return this.peerConnection.createOffer(offerOptions).then((offer) => {
      this.peerConnection.setLocalDescription(offer).then(() => this.send({
        event: "offer",
        data: offer
      }));
    }, (error) => {
      alert("Error creating an offer");
      console.log(error);
    });
  }

  handleOffer(offer: RTCSessionDescriptionInit) {
    this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // create and send an answer to an offer
    this.peerConnection.createAnswer().then((answer) => {
      this.peerConnection.setLocalDescription(answer)
      .then(() => 
      this.send({
        event: "answer",
        data: answer
      }));
    }, (error) => {
      alert("Error creating an answer");
      console.log("handleOffer Error", error);
    });

  };

  handleCandidate(candidate: RTCIceCandidateInit) {
    this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    console.log("handel Candidate", JSON.stringify(candidate));
  };

  handleAnswer(answer: RTCSessionDescriptionInit) {
    this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log("connection established successfully!!");
  };


  handleCall(caller) {
    console.log("call form", caller);
    this.callerName = caller;
  }

  async handleAcceptCall(data) {
    console.log("handle accept call", data);
    console.log("creating offer");
    // setTimeout(() => this.createOffer(), 400);
    await this.createOffer();
    console.log("call accepted");
  }

  handleDenyCall(data) {
    console.log("handle deny call", data);
  }

  callerName: string = "";
  myName: string = ""
  startCall() {
    console.log("starting a call");
    // this.start();
    this.initializingCall().then(() => {
      this.send({
        data: this.myName,
        event: "call"
      });
    });
  }

  acceptCall() {
    console.log("accept call");
    // requesting media
    console.log("requesting media");
    // this.start();
    this.initializingCall().then(() =>
      this.send({
        data: this.callerName,
        event: "accept_call"
      }));
  }

  denyCall() {
    console.log("deny call");
    this.send({
      data: this.callerName,
      event: "deny_call"
    });
  }

  closeCall() {
    this.stop();
  }

  gotRemoteStream(e) {
    console.log('gotRemoteStream', e.track, e.streams[0]);
    try {
      this.remoteVideo.nativeElement.srcObject = e.streams[0];;
    } catch (error) {
      console.log('error setting remote stream', error);
      this.remoteVideo.nativeElement.src = URL.createObjectURL(e.streams[0]);
    }

  }

  gotStream(stream) {
    console.log('Received local stream');
    try {
      this.localeVideo.nativeElement.srcObject = stream;
    } catch (error) {
      console.log('error setting locale stream', error);
      this.localeVideo.nativeElement.src = URL.createObjectURL(stream);
    }
    this.localstream = stream;
  }

  stop() {
    console.log('Ending Call' + '\n\n');
    this.peerConnection.close();
    this.peerConnection = null;
  }




}
