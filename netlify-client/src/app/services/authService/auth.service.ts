import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment} from "../../../environments/environment";

// const AUTH_API = environment.serverUrl + '/users/';
const AUTH_API = "https://us-west2-call-center-329523.cloudfunctions.net/login";

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private http: HttpClient) { }

  login(credentials): Observable<any> {
    return this.http.post(AUTH_API, {
      userID: credentials.username,
      pwd: credentials.password
    }, httpOptions);
  }

}
