import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from "../../../environments/environment";
import {TokenStorageService} from "../tokenStorage/token-storage.service";

const FILE_UPLOAD_API_ENDPOINT = environment.serverUrl + '/files/';

let httpOptions = {

};


@Injectable({
  providedIn: 'root'
})
export class UploadService {

  constructor(public httpClient: HttpClient,
              public tokenStorageService: TokenStorageService
              ) { }

  public uploadFile(soundFile, user, fileName, latitude, longitude) {
    const formData = new FormData();
    formData.append('audio_message', soundFile, fileName);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('user', user);

    httpOptions = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + this.tokenStorageService.getToken(),
        reportProgress: 'true',
        observe: 'events'
      })
    };

    return this.httpClient.post(FILE_UPLOAD_API_ENDPOINT, formData, httpOptions);

  }

}
