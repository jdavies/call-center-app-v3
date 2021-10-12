import { TestBed } from '@angular/core/testing';

import { GetTranscriptionService } from './get-transcription.service';

describe('GetTranscriptionService', () => {
  let service: GetTranscriptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GetTranscriptionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
