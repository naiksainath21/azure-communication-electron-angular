import { Component, ElementRef, OnInit } from '@angular/core';
import { CallAgent, CallClient, DeviceManager, VideoDeviceInfo, LocalVideoStream, AudioDeviceInfo, Call, VideoStreamRenderer, RemoteParticipant, CallAgentOptions } from '@azure/communication-calling';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { CommunicationIdentityClient } from '@azure/communication-identity';

// https://teams.microsoft.com/l/meetup-join/19:meeting_MGZiNGMzMzQtNTIzOS00Y2Y3LTk1YTktMzMwNmY2ODZhMjI5@thread.v2/0?context=%7B%22Tid%22:%22f90a5aa4-8a9e-423b-888e-5efaa63ba65d%22,%22Oid%22:%22c4b61ee2-642f-4f01-8db4-dce1571aa1c3%22%7D

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  private connectionString: string = "endpoint=https://sm-voice.communication.azure.com/;accesskey=fw30IRxAiquGXBvZ1o7V39n7qhg9G7aBVeoKxyKaUUt2ZDlxwKPGbTNMEGdBWZmRYCIf+Q526QmDDe/ATNQV8g==";

  callStateText : string = 'Not Connected';
  callStateIdentifier: number = 1;
  title = 'SM-Communications';
  teamsLink : string = '';

  callClient: CallClient = null!;
  callAgent: CallAgent = null!;
  deviceManager: DeviceManager = null!;
  videoDevices: VideoDeviceInfo[] = [];
  microphones: AudioDeviceInfo[] = [];
  speakers: AudioDeviceInfo[] = [];

  selectedVideoDevice : VideoDeviceInfo = null!;
  selectedMicrophone : AudioDeviceInfo = null!;
  selectedSpeaker : AudioDeviceInfo = null!;

  localVideoStream : LocalVideoStream = null!;
  localVideoRender : VideoStreamRenderer = null!;

  call : Call = null!;

  meetingParticipants : any = [];

  // * Buttons State
  connectBtnDisabled = true;

  constructor(private _eleRef: ElementRef) {

  }


  ngOnInit(): void {
    this.initialize();
  }

  async initialize() {

    this.callClient = new CallClient();
    const token = await this.generateTokenAsync();
    const tokenCredential = new AzureCommunicationTokenCredential(token);

  

    this.callAgent = await this.callClient.createCallAgent(tokenCredential, {displayName: 'Sai - azure'});

    this.deviceManager = await this.callClient.getDeviceManager();
    this.videoDevices = await this.deviceManager.getCameras();

    if(this.videoDevices.length > 0){
      this.selectedVideoDevice = this.videoDevices[0];
      this.localVideoStream = new LocalVideoStream(this.selectedVideoDevice);
    }

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

  connect(teamsLink : string) {
    const destincationToCall = {meetingLink : teamsLink};

    this.call = this.callAgent.join(destincationToCall);

    this.call.on('stateChanged', () => {
      this.callStateText = this.call.state
      if(this.call.state === 'Connected') {
        this.callStateIdentifier = 2;
        this.showLocalFeed();
      }
    })

    this.call.on('remoteParticipantsUpdated', () => {
      this.meetingParticipants = this.call.remoteParticipants;

      this.meetingParticipants.forEach((participant : RemoteParticipant) => {
        this.setUpRemoteParticipant(participant);
      });

    })

  }

  async showLocalFeed() {
    this.localVideoRender = new VideoStreamRenderer(this.localVideoStream);
    const  view = await this.localVideoRender.createView();
    var ele = this._eleRef.nativeElement.querySelector('#selfVideo')
    ele.appendChild(view.target);
  }

  async hideLocalFeed() {
    this.localVideoRender.dispose();
    this._eleRef.nativeElement.querySelector('#selfVideo').innerHtml = '';
  }

  setUpRemoteParticipant(participant: RemoteParticipant) {
    let videoStream = participant.videoStreams.find( function (s : any) {return s.mediaStreamType === 'Video'});
    let screenShareStream = participant.videoStreams.find( function (s : any) {return s.mediaStreamType === 'ScreenSharing'});

    this.subscribeToRemoteVideoStream(videoStream);

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
