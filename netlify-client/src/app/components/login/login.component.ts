import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import {AuthService} from "../../services/authService/auth.service";
import {TokenStorageService} from "../../services/tokenStorage/token-storage.service";
import {Router} from "@angular/router";
import {UserService} from "../../services/user/user.service";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  loginSuccessful: boolean  = false;
  loginMessage: string = 'Please enter credentials to login';

  username:FormControl;
  password: FormControl;

  constructor(private authService: AuthService,
              private tokenStorageService: TokenStorageService,
              private router: Router,
              private userService: UserService) { }

  ngOnInit(): void {
    this.username = new FormControl('');
    this.password = new FormControl('');
  }

  tryLogin() {
    console.debug('login request|user=' + this.username.value + '|password=' + this.password.value);

    this.authService.login({username:this.username.value, password:this.password.value})
      .subscribe((result) => {

        console.log(result.body);
        // console.log("jwt|" + result.jwt);
        console.log(result.token);
        this.tokenStorageService.storeToken(result.token);

        this.userService.setUserName(this.username.value);

        this.loginSucceeded();
      }, (errData) => {

        console.error(errData);
        this.loginFailed();
      });

  }

  loginSucceeded() {
    this.router.navigate(['/upload']);
    return this.loginSuccessful;
  }

  loginFailed() {
    this.loginMessage = "Could not authenticate you; please re-enter user ID and password";
    return !this.loginSuccessful;
  }


}
