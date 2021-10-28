import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {TokenStorageService} from "../tokenStorage/token-storage.service";
import {environment} from "../../../environments/environment";

const FILE_UPLOAD_API_ENDPOINT = environment.serverUrl + '/files/';


@Injectable({
  providedIn: 'root'
})
export class GetTranscriptionService {

  constructor(public httpClient: HttpClient,
              public tokenStorageService: TokenStorageService
  ) {
  }

  public getDetails(id) {
    console.log("GetTranscriptionService: getDetails() id = " + id);
    console.log("|--- GET " + FILE_UPLOAD_API_ENDPOINT + id);
    let httpOptions = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + this.tokenStorageService.getToken(),
        reportProgress: 'true',
        observe: 'events',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://call-center-605a88.netlify.app' 
      })
    };

    return this.httpClient.get(FILE_UPLOAD_API_ENDPOINT + id, httpOptions);
  }
}

