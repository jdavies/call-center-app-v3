# create keyspace with command below in DSE, or via astra UI.
# CREATE KEYSPACE callcenter WITH replication = {'class': 'NetworkTopologyStrategy', 'caas-dc': '3'}  AND durable_writes = true;

DROP TABLE IF EXISTS callcenter.users;
CREATE TABLE callcenter.users (
    username text,
    password text,
    userid uuid,
    firstname text,
    PRIMARY KEY (username, password)
);

-- We use this index to quickly look up the user to ensure it is valid.
CREATE CUSTOM INDEX userid_idx ON callcenter.users (userid) USING 'StorageAttachedIndex';

-- The password is a SHA256 hash of 'demo'
insert into callcenter.users(username, password, userid, firstname) 
   values('demo@datastax.com', '2a97516c354b68848cdbd8f54a226a0a55b21ed138e207ad6c5cbb9c00aa5aea', uuid(), 'Demo');
insert into callcenter.users(username, password, userid, firstname) 
   values('demo1@datastax.com', '2a97516c354b68848cdbd8f54a226a0a55b21ed138e207ad6c5cbb9c00aa5aea', uuid(), 'Demo1');
insert into callcenter.users(username, password, userid, firstname) 
   values('demo2@datastax.com', '2a97516c354b68848cdbd8f54a226a0a55b21ed138e207ad6c5cbb9c00aa5aea', uuid(), 'Demo2');
insert into callcenter.users(username, password, userid, firstname) 
   values('demo3@datastax.com', '2a97516c354b68848cdbd8f54a226a0a55b21ed138e207ad6c5cbb9c00aa5aea', uuid(), 'Demo3');

drop table if exists callcenter.message;
CREATE TABLE callcenter.message (
    call_id timeuuid PRIMARY KEY,
    call_audio_filetype text,
    call_link text,
    process_status text,
    transcript text,
    sentiment text,
    sentiment_score float,
    sentiment_magnitude float,
    latitude float,
    longitude float,
    geohash text,
    last_updated timestamp,
    last_updated_text text,
    username text
);

CREATE CUSTOM INDEX process_status_idx ON callcenter.message (process_status) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX call_audio_filetype_idx ON callcenter.message (call_audio_filetype) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX last_updated_text_idx ON callcenter.message (last_updated_text) USING 'StorageAttachedIndex';
CREATE CUSTOM INDEX username_idx ON callcenter.message (username) USING 'StorageAttachedIndex';

# if you want to run read_call_job.py without UI.  The recording files will need to exist in GCP bucket.
-- insert into call_center_voice_source (call_id, process_status, call_audio_filetype, call_link, sentiment, transcript, username, latitude, longitude, sentiment_score, sentiment_magnitude) values (98dc8b96-e33d-11eb-9ba1-93f65e406c93, 'new2', 'wav', 'gs://astra_call_center/1626887071597-demo1.wav', '', '', 'demo1', 33.31408, -111.92954, 0, 0);
-- insert into call_center_voice_source (call_id, process_status, call_audio_filetype, call_link, sentiment, transcript, username, latitude, longitude, sentiment_score, sentiment_magnitude) values (bf91e59c-e33d-11eb-91d7-13e05f86d681, 'new2', 'wav', 'gs://astra_call_center/1626887397017-demo1.wav', '', '', 'demo1', 32.31408, -112.92954, 0, 0);
-- insert into call_center_voice_source (call_id, process_status, call_audio_filetype, call_link, sentiment, transcript, username, latitude, longitude, sentiment_score, sentiment_magnitude) values (c721a630-e33d-11eb-91ec-e3c4d19ea93f, 'new2', 'wav', 'gs://astra_call_center/1626887736998-demo1.wav', '', '', 'demo1', 31.31408, -113.92954, 0, 0);
-- insert into call_center_voice_source (call_id, process_status, call_audio_filetype, call_link, sentiment, transcript, username, latitude, longitude, sentiment_score, sentiment_magnitude) values (e542fd30-e33d-11eb-82a7-43dabf1dc468, 'new2', 'wav', 'gs://astra_call_center/1626891103931-demo1.wav', '', '', 'demo1', 30.31408, -114.92954, 0, 0);
-- insert into call_center_voice_source (call_id, process_status, call_audio_filetype, call_link, sentiment, transcript, username, latitude, longitude, sentiment_score, sentiment_magnitude) values (d1abdc6a-e33d-11eb-a152-1fa60a10ce8f, 'new2', 'wav', 'gs://astra_call_center/1626891103931-demo1.wav', '', '', 'demo1', 29.31408, -115.92954, 0, 0);