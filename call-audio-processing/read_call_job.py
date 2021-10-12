import threading
import time
import requests
from datetime import datetime
from os import environ
import requests
import urllib
#Cassandra / Astra imports
from cassandra.auth import PlainTextAuthProvider
from cassandra.cluster import Cluster

secureconnect = ''
cloudlocation = ''
casstoken = ''
casspass = ''
cassuser = ''
baseURL = ''
baseURLDocument = ''
astraHeader = ''

def updateRow (jobid, updateData):
           rowURL = baseURL + '/' + jobid
           response1 = requests.put(rowURL, headers=astraHeader, data=updateData)

def updateDocument (jobid, username, updateData):
           rowURL = baseURLDocument + '/' + username + '/calls/' + jobid
           response1 = requests.patch(rowURL, headers=astraHeader, data=updateData)


def google_user_summary (jobid, row, sentiment_score, sentiment_magnitude):
    # fetch data from row
    username = row["username"]
    latitude = row["latitude"]
    longitude = row["longitude"]
    call_time = row["last_updated_text"]
    updateData = '{"latitude" : "' + str(latitude) + '"'
    updateData += ', "longitude" : "' + str(longitude) + '"'
    updateData += ', "sentiment_score" : "' + '%.2f' % sentiment_score + '"'
    updateData += ', "sentiment_magnitude" : "' + '%.2f' % sentiment_magnitude + '"'
    updateData += ', "call_time" : "' + call_time + '"'
    updateData += ', "callid" : "' + jobid + '"'
    updateData += '}'
    updateDocument(jobid, username, updateData)

    updateData = '{"process_status" : "gcp_complete"'
    updateData += ', "last_updated_text" : "' + call_time + '"'
    updateData += '}'
    updateRow(jobid, updateData)



def google_transcribe(audio_file_name, jobid, row):
    from google.cloud import speech
    #from google.cloud.speech import types

    transcript = ''
    gcs_uri = audio_file_name

    client = speech.SpeechClient()
    audio = speech.RecognitionAudio(uri=gcs_uri)


    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code="en-US",
    )


    # Detects speech in the audio file
    operation = client.long_running_recognize(config=config, audio=audio)
    response = operation.result(timeout=10000)

    for result in response.results:
        transcript += result.alternatives[0].transcript

    currentTime = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # had trouble inserting the transcript via REST, probably due to urlencoding, so going to stick with CQL

    #Astra connection properties
    cloud_config = {'secure_connect_bundle': secureconnect}
    auth_provider = PlainTextAuthProvider(cassuser, casspass)
    cluster = Cluster(cloud=cloud_config, auth_provider=auth_provider)
    session = cluster.connect()
    session.execute(
        f'update callcenter.call_center_voice_source set last_updated=%s, process_status=%s, transcript=%s, last_updated_text=%s where call_id={jobid}',
        (datetime.utcnow(), 'gcp_sentiment_needed', transcript, currentTime))

    session.shutdown()

    threading.Thread(target=google_sentiment, args=(jobid, transcript, row)).start()


def google_sentiment(jobid, transcript, row):
    from google.cloud import language_v1

    client = language_v1.LanguageServiceClient()

    document = language_v1.Document(content=transcript, type_=language_v1.Document.Type.PLAIN_TEXT)
    annotations = client.analyze_sentiment(document=document)

    score = annotations.document_sentiment.score
    magnitude = annotations.document_sentiment.magnitude

    currentTime = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
 
    final_sentiment = 'Overall Sentiment: score of {:+.2f} with magnitude of {:+.2f}'.format(
        score, magnitude)


    updateData = '{"process_status" : "gcp_user_summary"'
    updateData += ', "last_updated_text" : "' + currentTime + '"'
    updateData += ', "sentiment_score" : "' + str(score) + '"'
    updateData += ', "sentiment_magnitude" : "' + str(magnitude) + '"'
    updateData += ', "sentiment" : "' + final_sentiment + '"'
    updateData += '}'
    updateRow(jobid, updateData)
    google_user_summary(jobid, row, score, magnitude)

def amazon_transcribe(audio_file_name, jobid):
    import boto3
    import requests

    aws_uri = audio_file_name
    transcript = ''
    jobname = str(jobid)+'_'+datetime.utcnow().strftime('%Y-%m-%d-%H.%M.%S.%f')[:-3]

    transcribe_client = boto3.client('transcribe',  region_name='us-east-1')
    transcribe_client.start_transcription_job(TranscriptionJobName=jobname, Media={'MediaFileUri': aws_uri},
                                       MediaFormat='wav', LanguageCode='en-US')

    while True:
        status = transcribe_client.get_transcription_job(TranscriptionJobName=jobname)
        if status['TranscriptionJob']['TranscriptionJobStatus'] in ['COMPLETED', 'FAILED']:
            break
        time.sleep(10)

    response = requests.get(status['TranscriptionJob']['Transcript']['TranscriptFileUri']).json()
    transcript = response['results']['transcripts'][0]['transcript']

    #Astra connection properties
    cloud_config = {'secure_connect_bundle': secureconnect}
    auth_provider = PlainTextAuthProvider(cassuser, casspass)
    cluster = Cluster(cloud=cloud_config, auth_provider=auth_provider)
    session = cluster.connect()
    session.execute(
        f'update callcenter.call_center_voice_source set last_updated=%s, process_status=%s, transcript=%s where call_id={jobid}',
        (datetime.utcnow(), 'aws_sentiment_needed', transcript))

    threading.Thread(target=amazon_sentiment, args=(jobid, transcript)).start()

    session.shutdown()


def amazon_sentiment(jobid, transcript):
    import boto3

    comprehend = boto3.client(service_name='comprehend', region_name='us-east-1')

    results = comprehend.detect_sentiment(Text=transcript, LanguageCode='en')

    final_sentiment = 'Overall Sentiment is {}: Scores are Positive {:+.2f}, Negative {:+.2f}, Neutral {:+.2f}, and Mixed {:+.2f}'.format(
        results['Sentiment'], results['SentimentScore']['Positive'], results['SentimentScore']['Negative'], results['SentimentScore']['Neutral'], results['SentimentScore']['Mixed'])

    #Astra connection properties
    cloud_config = {'secure_connect_bundle': secureconnect}
    auth_provider = PlainTextAuthProvider(cassuser, casspass)
    cluster = Cluster(cloud=cloud_config, auth_provider=auth_provider)
    session = cluster.connect()
    session.execute(
        f'update callcenter.call_center_voice_source set last_updated=%s, process_status=%s, sentiment=%s where call_id={jobid}',
        (datetime.utcnow(), 'complete', final_sentiment))
    session.shutdown()


def get_transactions():

    response = requests.get(baseURL+'?where={"process_status":{"$eq":"new"}}', headers=astraHeader)
    rows = response.json()["data"]
    cur_process_status = ''

    for row in rows:
        mediafileurl = row["call_link"]
        jobid = row["call_id"]

        currentTime = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

        if cloudlocation == 'gcp':
            threading.Thread(target=google_transcribe,args=(mediafileurl, jobid, row)).start()
            cur_process_status = 'gcp_transcribe_scheduled'

        elif cloudlocation == 'aws':
           #threading.Thread(target=amazon_transcribe, args=(mediafileurl, jobid)).start()
            print("AWS not available yet")
            cur_process_status = 'aws_unavailable'

        elif cloudlocation == 'azure':
            print("Azure not available yet")
            cur_process_status = 'azure_unavailable'

        updateData = '{"process_status" : "' + cur_process_status + '"'
        updateData += ', "last_updated_text" : "' + currentTime + '"'
        updateData += '}'
        updateRow(jobid, updateData)



def main():
    import argparse
    global secureconnect
    global cloudlocation
    global casstoken
    global cassuser
    global casspass
    global baseURL
    global baseURLDocument
    global astraHeader


    parser = argparse.ArgumentParser()
    parser.add_argument("--secure_connect", type=str, required=True,
                        help="Location of Astra secure connect package")
    parser.add_argument("--creds",type=str,
                        help="Location of Cloud provider's connection package, if needed")
    parser.add_argument("--casstoken",type=str,
                        help="Astra login token for API transactions")
    parser.add_argument("--interval", type=int, default=60,
                        help="Interval to pause before checking for new transactions (default 60)")
    parser.add_argument("--keyspace", type=str, default='callcenter',
                        help="Keyspace for callcenter tables")
    parser.add_argument("--cluster_id", type=str, default='945caf99-7bfb-494b-8a01-f19367a25b0a',
                        help="Astra Cluster ID")                    
    parser.add_argument("--astra_region", type=str, default='us-east-1',
                        help="Astra Cluster Region (e.g. us-east-1)")                    
    parser.add_argument("--cloud", type=str, default='gcp', choices=['gcp', 'aws', 'azure'],
                        help="Cloud provider app is running in: gcp (default), aws, azure")
    parser.add_argument("--cassuser",type=str,
                        help="Astra login user for CQL transactions")
    parser.add_argument("--casspass",type=str,
                        help="Astra login password for CQL transactions")
    args = parser.parse_args()
    secureconnect = args.secure_connect
    waittime = args.interval
    cloudlocation = args.cloud

    casstoken = args.casstoken
    cassuser = args.cassuser
    casspass = args.casspass

    baseURL = 'https://' + args.cluster_id + '-' + args.astra_region + '.apps.astra.datastax.com/api/rest/v2/keyspaces/' + args.keyspace + '/call_center_voice_source'
    baseURLDocument = 'https://' + args.cluster_id + '-' + args.astra_region + '.apps.astra.datastax.com/api/rest/v2/namespaces/' + args.keyspace + '/collections/user_summary'
    astraHeader = {"Content-Type": "application/json", "X-Cassandra-Token" : casstoken}
    if args.creds is not None:
        environ["GOOGLE_APPLICATION_CREDENTIALS"] = args.creds

    while True:
        get_transactions()
        time.sleep(waittime)


if __name__ == "__main__":
    main()
