import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {TokenStorageService} from "../tokenStorage/token-storage.service";
import {environment} from "../../../environments/environment";

const RECORDINGS_API_ENDPOINT = environment.serverUrl + '/recordings/';


@Injectable({
  providedIn: 'root'
})
export class RecordingsService {

  constructor(public httpClient: HttpClient,
              public tokenStorageService: TokenStorageService
  ) {
  }

  public getRecordings() {

    let httpOptions = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer ' + this.tokenStorageService.getToken(),
        reportProgress: 'true',
        observe: 'events'
      })
    };

    return this.httpClient.get(RECORDINGS_API_ENDPOINT, httpOptions);
  }

}
