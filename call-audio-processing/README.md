# Intro

This covers the python script that processes the recordings, read_call_job.py

# Prerequisites
1. python installed
2. cassandra python libraries
3. google.cloud python libraries
4. Astra account including connection bundle, username, password, and API token
5. GCP service account including 

# Initial Flow
Command line arguments will be referenced by -- (e.g. --keyspace).  Command line Arguments detailed in a section below.  Current assumption is that all calls will be transcribed on GCP, but there are hooks for AWS and Azure.

1. Start the script on the AWS server.  Can run on the same server as the uploadserver.  
2. Script loops and wakes up every --interval seconds (default 60)
3. When wakes up, calls get_transactions() to check Astra table call_center_voice_source (hard coded) via a rest call for any new calls to transcribe (call_center_voice_source.process_status = new).  The rest call is constructed according to the passed in parameters --cluster_id, --astra_region, --keyspace.
4. For all new calls, kick of a a thread to transcribe via google_transcribe() , and set the process_status to 'gcp_transcribe_scheduled' and last_updated_text to current timestamp (we are cheating on storing the timestamp as text due to timestamp format conversion issues with REST API)
5. google_transcribe() calls the Google transcription API with the link to the recording.  Returns a series of transcriptions.  We grab the first one and write to the table via python connector CQL (storing the transcript string via REST was difficult).  The transcript is stored in the call_center_voice_source.transcript. Sets process status to 'gcp_sentiment_needed', then calls google_sentiment()
6. google_sentment() calls Google sentiment analysis API to analyze the transcription.  The sentiment score is stored in call_center_voice_source.sentiment_score and sentiment_magnitude.  To show off Document API, we also created at collection 'gcp_user_summary' that will store the sentiment for each phone call.  google_user_summary() is called to do this
7. google_user_summary() records a summary for the call including the sentiment, call time, and geo location.


# Command Line Arguments
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


Command line that we used

python3 read_call_job.py --secure_connect /pathToAstraBundle/secure-connect-osaeed-serverless.zip --creds /pathToGCPToken/gcp-lcm-project-471fcda99edb.json --casstoken AstraCS:cassandraToken --cassuser astraUsername --casspass astraPassword --interval 5
