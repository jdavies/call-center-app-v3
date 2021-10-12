import { TestBed } from '@angular/core/testing';

import { RecordingsService } from './recordings.service';

describe('GetRecordingsService', () => {
  let service: RecordingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecordingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
