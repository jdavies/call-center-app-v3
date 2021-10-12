import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import { GoogleMapsModule, MapInfoWindow, MapMarker } from "@angular/google-maps";
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {RecordingsService} from "../../services/recordings/recordings.service";
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { MatSort } from "@angular/material/sort";

export interface Marker {
  latLng: google.maps.LatLng;
  index: number;
  transcription: string;
  sentiment: string;
  negativeSentiment: boolean;
  lastUpdatedText: string;
  username: string;
  sentimentScore: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild(MapInfoWindow) infoWindow: MapInfoWindow;
  @ViewChild(MatSort) sort: MatSort;


  center: google.maps.LatLngLiteral = {lat: 40, lng: -90};
  markerPositions: google.maps.LatLngLiteral[] = [];
  astraMarkers:Marker[] = [];
  zoom = 4;
  apiLoaded: Observable<boolean>;
  transcription: string = '';
  LAT_LNG_ROUNDING_FACTOR = 3;

  showTranscriptions:boolean = false;
  private markersToShow:Marker[] = [];
  tableColumns  :  string[] = ['lastUpdatedText', 'transcription', 'username', 'sentimentScore' ];

  public dataSource = new MatTableDataSource<Marker>();

  constructor(httpClient: HttpClient,
              recordingsService: RecordingsService) {
    this.apiLoaded = httpClient.jsonp('https://maps.googleapis.com/maps/api/js?key=AIzaSyAFlsnuudffm1taU0MPUjxT0OGhyc-2doE', 'callback')
      .pipe(
        map(() => true),
        catchError(() => of(false)),
      );

    recordingsService.getRecordings()
      .subscribe((retData) => {
        let records = JSON.parse(JSON.stringify(retData) );
        for(let i=0; i< records.length; i++) {
          console.log('processing record');
          console.log(records[i]);
          let marker = new google.maps.Marker({
            position: {
              lat: records[i].latitude,
              lng: records[i].longitude
            },
            clickable: true,
          });

          let sentimentValue = (records[i].sentiment_score).toFixed(2);
          this.astraMarkers.push({
            latLng: marker.getPosition(),
            index: i,
            transcription: '' + records[i].transcript,
            sentiment: '' + records[i].sentiment,
            lastUpdatedText: '' + records[i].last_updated_text,
            username: '' + records[i].username,
            sentimentScore: '' + sentimentValue,
            negativeSentiment: (sentimentValue < -0.25) ? true : false,
            });

          if (i==0) {
            this.center.lat = records[i].latitude;
            this.center.lng = records[i].longitude;
          }

        }
      }, (errData) => {
        console.error('could not get any recordings');
        console.error(errData);
        return;
      })

  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  addMarker(event: number) {
    // this.markerPositions.push(event.latLng.toJSON());
    console.log('addMarker called');
    console.log(event);
  }

  openInfoWindow(marker) {
    // this.infoWindow.open(marker.latLng);
    console.log('openInfoWindow invoked with');
    console.log(marker);
    this.showTranscriptions = false;
    this.markersToShow = [];

    let markerLat = marker.latLng.lat().toFixed(this.LAT_LNG_ROUNDING_FACTOR);
    let markerLng = marker.latLng.lng().toFixed(this.LAT_LNG_ROUNDING_FACTOR);
    this.transcription = marker.transcription;
    console.log("added markersToShow|" + markerLat + '|' + markerLng);

    for (let i=0; i< this.astraMarkers.length; i++) {

      let lat = (this.astraMarkers[i].latLng.lat()).toFixed(this.LAT_LNG_ROUNDING_FACTOR);
      let lng = (this.astraMarkers[i].latLng.lng()).toFixed(this.LAT_LNG_ROUNDING_FACTOR);

      if (( lat === markerLat) && (lng === markerLng)) {
        this.markersToShow.push(this.astraMarkers[i]);
      } else {
        console.log("did not match|" + lat + '|' + lng);
        console.log(this.astraMarkers[i]);
      }

    }
    console.log(this.markersToShow);
    this.dataSource.data = this.markersToShow;
    this.showTranscriptions = true;
  }

}
