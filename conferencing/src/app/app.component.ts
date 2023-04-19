import { Component, ElementRef, OnInit } from '@angular/core';
import { CallAgent, CallClient, DeviceManager, VideoDeviceInfo, LocalVideoStream, AudioDeviceInfo, Call, VideoStreamRenderer, RemoteParticipant, CallAgentOptions } from '@azure/communication-calling';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { CommunicationIdentityClient } from '@azure/communication-identity';

const teamsURL = "https://teams.microsoft.com/l/meetup-join/19:meeting_NzEyNDAyM2MtNzMxZC00NTkwLWE5ZGQtYzE4OWYwZGE4ZDQ2@thread.v2/0?context=%7B%22Tid%22:%22f90a5aa4-8a9e-423b-888e-5efaa63ba65d%22,%22Oid%22:%226ba51c9e-d97d-4f11-8c2b-c948accddae0%22%7D";


// https://teams.microsoft.com/l/meetup-join/19:meeting_MGZiNGMzMzQtNTIzOS00Y2Y3LTk1YTktMzMwNmY2ODZhMjI5@thread.v2/0?context=%7B%22Tid%22:%22f90a5aa4-8a9e-423b-888e-5efaa63ba65d%22,%22Oid%22:%22c4b61ee2-642f-4f01-8db4-dce1571aa1c3%22%7D

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  private connectionString: string = "endpoint=https://sm-voice.communication.azure.com/;accesskey=fw30IRxAiquGXBvZ1o7V39n7qhg9G7aBVeoKxyKaUUt2ZDlxwKPGbTNMEGdBWZmRYCIf+Q526QmDDe/ATNQV8g==";

  callStateText: string = 'Not Connected';
  callStateIdentifier: number = 1;
  title = 'SM-Communications';
  teamsLink: string = '';

  callClient: CallClient = null!;
  callAgent: CallAgent = null!;
  deviceManager: DeviceManager = null!;
  videoDevices: VideoDeviceInfo[] = [];
  microphones: AudioDeviceInfo[] = [];
  speakers: AudioDeviceInfo[] = [];

  selectedVideoDevice: VideoDeviceInfo = null!;
  selectedMicrophone: AudioDeviceInfo = null!;
  selectedSpeaker: AudioDeviceInfo = null!;

  localVideoStream: LocalVideoStream = null!;
  localVideoRender: VideoStreamRenderer = null!;

  call: Call = null!;

  meetingParticipants: any = [];

  // * Buttons State
  connectBtnDisabled = true;

  mediaDevices = navigator.mediaDevices as any;

  constructor(private _eleRef: ElementRef) {

  }


  ngOnInit(): void {

    (async () => {
      await this.initialize();
      await this.connect(teamsURL);
    })();
  }

  async initialize() {

    this.callClient = new CallClient();
    const token = await this.generateTokenAsync();
    const tokenCredential = new AzureCommunicationTokenCredential(token);

    this.callAgent = await this.callClient.createCallAgent(tokenCredential, { displayName: 'Sai - azure' });

    this.deviceManager = await this.callClient.getDeviceManager();
    this.videoDevices = await this.deviceManager.getCameras();
    this.selectedVideoDevice = this.videoDevices[0];
    // if (this.videoDevices.length > 0) {
    //   this.selectedVideoDevice = this.videoDevices[0];
    //   this.localVideoStream = new LocalVideoStream(this.selectedVideoDevice);
    // }

    // try {
    //   const stream = await this.mediaDevices.getUserMedia({
    //     audio: false,
    //     video: {
    //       mandatory: {
    //         chromeMediaSource: 'desktop',
    //         chromeMediaSourceId: "screen:0:0",
    //         minWidth: 1280,
    //         maxWidth: 1280,
    //         minHeight: 720,
    //         maxHeight: 720
    //       }
    //     }
    //   })

    //   this.localVideoStream = new LocalVideoStream(stream);

    // } catch (e) {
    //   console.error(e);
    // }

    this.microphones = await this.deviceManager.getMicrophones();
    this.selectedMicrophone = this.microphones[0];

    this.speakers = await this.deviceManager.getSpeakers();
    this.selectedSpeaker = this.speakers[0];

    this.deviceManager.selectMicrophone(this.selectedMicrophone);
    this.deviceManager.selectSpeaker(this.selectedSpeaker);

    this.connectBtnDisabled = false;
  }

  async generateTokenAsync() {
    const identityClient = new CommunicationIdentityClient(this.connectionString);
    const identityResponse = await identityClient.createUser();

    console.log(`\n Created an identity with ID: ${identityResponse.communicationUserId}`);

    let identityTokenResponse = await identityClient.createUserAndToken(["voip"]);

    let { token, expiresOn, user } = identityTokenResponse;

    console.log(`\nCreated an user ${user.communicationUserId}`)
    console.log(`\Token expires on ${expiresOn}`)

    return token;

  }

  connect(teamsLink: string) {
    const destincationToCall = { meetingLink: teamsLink };

    this.call = this.callAgent.join(destincationToCall);

    this.call.on('stateChanged', async () => {
      this.callStateText = this.call.state
      if (this.call.state === 'Connected') {
        this.callStateIdentifier = 2;
        await this.call.mute();
        // await this.stopCamera();
        // this.showLocalFeed();
        this.meetingParticipants = this.call.remoteParticipants;
        this._eleRef.nativeElement.querySelector('#refreshRemoteMedia-button').click();
      }
    })

    this.call.on('remoteParticipantsUpdated', () => {
      this.meetingParticipants = this.call.remoteParticipants;

      this.meetingParticipants.forEach((participant: RemoteParticipant) => {
        this.setUpRemoteParticipant(participant);
      });

    })

  }

  async disconnect() {
    await this.call.hangUp();
    this.callStateIdentifier = 1;
  }

  async mute() {
    await this.call.mute();
  }

  async unMute() {
    await this.call.unmute();
  }

  async startCamera() {
    this.localVideoStream  = new LocalVideoStream(this.selectedVideoDevice);
    await this.call.startVideo(this.localVideoStream);
    this.showLocalFeed();
  }

  async stopCamera() {
    await this.call.stopVideo(this.localVideoStream);
    this.hideLocalFeed();
  }

  async startShare() {
    try {
      const stream = await this.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: "screen:0:0",
            minWidth: 1280,
            maxWidth: 1280,
            minHeight: 720,
            maxHeight: 720
          }
        }
      })
      this.localVideoStream = new LocalVideoStream(stream);
      await this.call.startVideo(this.localVideoStream);
      // showLocalFeed(); // ! Do not show own screen

      // document.getElementById('mainbody').style.border = "5px solid red"

    } catch (e) {
      console.error(e);
    }
  }

  async stopShare() {
    await this.call.stopVideo(this.localVideoStream);
    // document.getElementById('mainbody').style.border = "none"
    this.hideLocalFeed();
  }

  async showLocalFeed() {
    this.localVideoRender = new VideoStreamRenderer(this.localVideoStream);
    const view = await this.localVideoRender.createView();
    var ele = this._eleRef.nativeElement.querySelector('#selfVideo')
    ele.appendChild(view.target);
  }

  async hideLocalFeed() {
    if (this.localVideoRender) this.localVideoRender.dispose();
    this._eleRef.nativeElement.querySelector('#selfVideo').innerHtml = '';
  }

  subscribeToRemoteFeed() {
    this.meetingParticipants.forEach((participant: RemoteParticipant) => {
      this.setUpRemoteParticipant(participant);
    });
  }

  setUpRemoteParticipant(participant: RemoteParticipant) {
    let videoStream = participant.videoStreams.find(function (s: any) { return s.mediaStreamType === 'Video' });
    let screenShareStream = participant.videoStreams.find(function (s: any) { return s.mediaStreamType === 'ScreenSharing' });

    this.subscribeToRemoteVideoStream(videoStream);
    if (screenShareStream) {
      this.subscribeToRemoteVideoStream(screenShareStream);
    }

  }

  async subscribeToRemoteVideoStream(remoteVideoStream: any) {

    var remoteVideosGallery = this._eleRef.nativeElement.querySelector('#remoteVideosGallery');

    let renderer = new VideoStreamRenderer(remoteVideoStream);
    let view: any;
    let remoteVideoContainer = document.createElement('div');
    remoteVideoContainer.className = 'remote-video-container';

    /**
     * isReceiving API is currently an @beta feature.
     * To use this api please use 'beta' version of Azure Communication Services Calling Web SDK.
     */
    let loadingSpinner = document.createElement('div');
    // See the css example below for styling the loading spinner.
    loadingSpinner.className = 'loading-spinner';


    const createView = async () => {
      // Create a renderer view for the remote video stream.
      view = await renderer.createView();
      // Attach the renderer view to the UI.
      remoteVideoContainer.appendChild(view.target);
      remoteVideosGallery.appendChild(remoteVideoContainer);
    }

    // Remote participant has switched video on/off
    remoteVideoStream.on('isAvailableChanged', async () => {
      try {
        if (remoteVideoStream.isAvailable) {
          remoteVideoContainer.innerHTML = ''
          await createView();
        } else {
          view.dispose();
          remoteVideosGallery.removeChild(remoteVideoContainer);
        }
      } catch (e) {
        console.error(e);
      }
    });

    // Remote participant has video on initially.
    if (remoteVideoStream.isAvailable) {
      try {
        await createView();
      } catch (e) {
        console.error(e);
      }
    }
  }

}
