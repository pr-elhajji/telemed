import { Component, OnInit, ElementRef, ViewChild} from '@angular/core';
import {CallState} from '../../../models/CallState'
import { ActivatedRoute, Params } from '@angular/router';
import { Patient } from 'src/app/models/Patient';
import { PatientService } from 'src/app/services/patient.service';
import { DoctorService } from 'src/app/services/doctor.service';
import { AuthService } from 'src/app/services/auth.service';
import { Doctor } from 'src/app/models/Doctor';
// import { BASE_URL, BASE_SOCKET_URL } from 'src/app/shared';
import { environment } from 'src/environments/environment';



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

  
  localstream: MediaStream;

  // websocket stuff
  // websocketUrl = BASE_SOCKET_URL+ "/socket"; // production url
  // websocketUrl =  'ws://localhost:8080/socket' // dev url
  conn: WebSocket;
  peerConnection: RTCPeerConnection;
  dataChannel: RTCDataChannel;

  // call states
  callState: CallState = CallState.Idle;

  // patient
  patient:Patient;
  patientId:string;

  // doctor info
  doctor:Doctor;
  avatar: any;



  constructor(
    private route:ActivatedRoute,
    private patientService:PatientService,
    private doctorService:DoctorService,
    private authService:AuthService) { }

  ngOnInit(): void {
    // this.conn = new WebSocket('ws://' + location.hostname + (location.port ? ':' + location.port : '') + '/socket')
    // getting patient info
    this.route.params
      .subscribe(
        (params: Params) => {
          this.patientId = params['id'];
          this.patientService.getById(this.patientId).subscribe((patient:Patient) => {
            this.patient = patient;
          })
        });

    this.authService.getCurrentUser().subscribe(res => {
          this.doctorService.getById(res.id).subscribe(doc => {
            this.doctor = doc;
            console.log("socket url", environment.webSocketURL);
            this.conn = new WebSocket(environment.webSocketURL + '?userId=' + this.doctor.id);
            this.conn.onopen = (ev: Event) => this.onOpen(ev);
            this.conn.onmessage = (msg: MessageEvent) => this.onMessage(msg);
          });
          this.doctorService.getAvatar(res.id).subscribe(avatar => {
            this.avatar = 'data:image/jpeg;base64,' + avatar?.image?.data;
          })
        });
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
      case "end_call":
        this.handleEndCall(data);
        break;
      default:
        break;
    }
  };


  initializePeer() {
    let configuration: RTCConfiguration = {
      iceServers: [
        { urls: "stun:23.21.150.121" },
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: 'turn:numb.viagenie.ca',
          credential: 'muazkh',
          username: 'webrtc@live.com'
      },
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
    this.initializePeer();
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
    message.calleeId = this.patient.id;
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
    this.callState = CallState.Ringing;
  }

  async handleAcceptCall(data) {
    console.log("handle accept call", data);
    console.log("creating offer");
    // setTimeout(() => this.createOffer(), 400);
    await this.createOffer();
    console.log("call accepted");
    this.callState = CallState.Ongoing;
  }

  handleDenyCall(data) {
    console.log("handle deny call", data);
    this.callState = CallState.Denied;
  }

  handleEndCall(data) {
    console.log("handle End call", data);
    this.callState = CallState.Ended;
    this.stop();
  }

  callerName: string = "";
  myName: string = ""
  startCall() {
    console.log("starting a call");

    if(!this.doctor){
      console.log("need doctor info first");
      return;
    }

    if(!this.patient){
      console.log("need patient info first");
      return;
    }
    
    this.initializingCall().then(() => {
      this.send({
        data: this.myName,
        event: "call",
        calleeId: this.patient.id,
        callerId: this.doctor.id,
      });
      this.callState = CallState.Ringing;
    });
  }

  acceptCall() {
    console.log("accept call");
    // requesting media
    console.log("requesting media");
    // this.start();
    this.initializingCall().then(() => {
      this.send({
        data: this.callerName,
        event: "accept_call"
      });
      this.callState = CallState.Ongoing;
    });
  }

  denyCall() {
    console.log("deny call");
    this.send({
      data: this.callerName,
      event: "deny_call"
    });
    this.callState = CallState.Denied;
  }

  endCall() {
    this.callState = CallState.Ended;
    this.send({
      data: this.callerName,
      event: "end_call"
    });
    this.stop();
  }

  cancelCall(){
    this.stop();
    this.callState = CallState.Canceled;
    this.send({
      data: this.callerName,
      event: "cancel_call"
    });
  }

  gotRemoteStream(e) {
    console.log('gotRemoteStream', e.track, e.streams[0]);
    try {
      // this.remoteVideo.nativeElement.srcObject = null;
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
    this.localstream.getTracks().forEach((track) =>{
      console.log('stoping doctor locale stream', track);
      track.stop();
    });

    this.localeVideo.nativeElement.srcObject = null;
    
  }


  isIdle():boolean {
    return this.callState == CallState.Idle
  }
  isDenied():boolean {
    return this.callState == CallState.Denied;
  }
  isOngoing():boolean {
    return this.callState == CallState.Ongoing;
  }
  isEnded():boolean {
    return this.callState == CallState.Ended;
  }
  isRinging():boolean {
    return this.callState == CallState.Ringing;
  }

  isCanceled():boolean {
    return this.callState == CallState.Canceled;
  }
}
