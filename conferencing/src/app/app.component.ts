import { Component, OnInit } from '@angular/core';
import { CallAgent, CallClient, DeviceManager, VideoDeviceInfo , LocalVideoStream, AudioDeviceInfo} from '@azure/communication-calling';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { CommunicationIdentityClient } from '@azure/communication-identity';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  private connectionString: string = "endpoint=https://sm-voice.communication.azure.com/;accesskey=fw30IRxAiquGXBvZ1o7V39n7qhg9G7aBVeoKxyKaUUt2ZDlxwKPGbTNMEGdBWZmRYCIf+Q526QmDDe/ATNQV8g==";
  title = 'SM-Communications';

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

  ngOnInit(): void {
    this.initialize();
  }

  async initialize() {

    this.callClient = new CallClient();
    const token = await this.generateTokenAsync();
    const tokenCredential = new AzureCommunicationTokenCredential(token);
    this.callAgent = await this.callClient.createCallAgent(tokenCredential);

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

}
