'use strict';

const escapeHtml = require('escape-html');
const { createWriteStream } = require("fs");
const path = require("path");
const { Storage } = require("@google-cloud/storage");
const speech = require('@google-cloud/speech');
const stream = require('stream');
const cors = require('cors')({ origin: 'https://call-center-605a88.netlify.app' });
var jwt = require('jsonwebtoken');
const { v1: uuidv1 } = require('uuid');
const { createClient } = require("@astrajs/rest");
const { SpeechClient } = require('@google-cloud/speech/build/src/v1p1beta1');
const basePath = `/api/rest/v2/keyspaces/${process.env.KEYSPACE}`;

/**
 * Responds to a login request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 * 
 * GET /${call_id}
 * 
 * Gets the record for the given call ID from Astra
 * 
 * POST
 * 
 * Uploads a voice recording for the logged in user. It then performs a
 * speech-to-text transcription and writes it all out to the Astra database.
 */
exports.files = async (req, res) => {
  // File uploads are done via POST
  try {
    cors(req, res, async () => {
      if(req.method === 'OPTIONS') {
        // Send response to OPTIONS requests
        res.set('Access-Control-Allow-Origin', 'https://call-center-605a88.netlify.app'); // Allow for CORS
        res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Max-Age', '3600');
        res.status(204).send('');
      } else if (req.method == 'POST') {
        // A voice recording is being uploaded from Netlify
        try {
          uploadRecording(req, res);
          // console.log("POST result = " + JSON.stringify(result));
          // res.status(201).send(result);
        } catch(err) {
          console.log("POST caught an error: " + err);
        }
      } else if (req.method == 'GET') {
        // Netlify is polling the status of an upload
        console.log("GET files/");
        console.log("GET url = " + req.url);
        res.status(200).send('{"foo": "bar"}');
      }
    }); //cors
  } catch(err) {
    console.log("files/ caught an error: " + err);
  } 
};

/**
 * Uploads a file to the google storage, and transcribes it
 * @param {!express:Request} req 
 * @param {!express:Response} res 
 */
async function uploadRecording(req, res) {
  // Get the JWT
  const tokens = req.headers['authorization'].split(" ");
  const token = tokens[1];

  // Verify the token
  var decoded = jwt.verify(token, process.env.JWT_SECRET);
  const gc = new Storage({
    keyFilename: "call-center-329523-51a0ac5aac00.json",
    projectId: "call-center-329523"
  });
  console.log("gc created!");

  const bucketName = "voice_mail";
  const voiceFilesBucket = gc.bucket(bucketName);
  console.log("got the bucket!");

  const destFileName = req.headers['traceparent'] + ".wav";
  const file = voiceFilesBucket.file(destFileName);
  const passthroughStream = new stream.PassThrough();
  passthroughStream.write(req.body);
  passthroughStream.end();

  async function streamFileUpload() {
    passthroughStream.pipe(file.createWriteStream()).on('finish', () => {
      // The file upload is complete
      console.log("UPLOAD COMPLETE");
    });

    console.log(`${destFileName} uploaded to ${bucketName}`);
  }
  let call_id = "";
  let transcription = "";

  try {
    await streamFileUpload();
    const latlong = req.headers['x-appengine-citylatlong'].split(",");
    const latitude = parseFloat(latlong[0]);
    const longitude = parseFloat(latlong[1]);
    const voiceFileURI = "gs://voice_mail/" + destFileName;

    // Now write the record to Astra DB
    var result = await writeAstraRecord(destFileName, decoded.username, latitude, longitude, transcription);
    console.log("result.statusCode = " + result.statusCode);
    if(result.statusCode == 201) {
      // Successfully wrote to the Astra DB.
      //Now lets start the transcription of the file
      // console.log("writeAstraRecord - result = " + JSON.stringify(result));
      call_id = result.time_uuid;
      console.log("Creating the speech client...");
      // Creates a client
      const speechClient = new speech.SpeechClient();
      transcription = await transcribe(voiceFileURI, speechClient);
      const updateBody = {"transcript" : transcription};
      const updateResult = await updateCallRecord(call_id, updateBody);
      // console.log("updateCallRecord results: " + JSON.stringify(updateResult));
    } else {
      // There was an error writing to Astra!
      // console.log("Error writing to Astra DB: " + JSON.stringify(result));
    }
  } catch {
    console.log(console.error);
  }

  res.statusCode = 201;
  const responseMessage = `{"message": "File uploaded!", "call_id": "${call_id}", "transcription" : "${transcription}" }`;
  console.log("responseMessage = " + responseMessage);
  res.end(responseMessage);
}

/**
 * Update the Astra database with the recording info
 * @param destFileName The name of the file
 */
async function writeAstraRecord(destFileName, userName, latitude, longitude, transcript) {
  const uri = basePath + "/message";
  // create an Astra DB client
  const astraClient = await createClient({
    astraDatabaseId: process.env.ASTRA_DB_ID,
    astraDatabaseRegion: process.env.ASTRA_DB_REGION,
    applicationToken: process.env.ASTRA_DB_TOKEN
  });

  var time_uuid = uuidv1();

  var body = { 
    "call_id" : time_uuid,
    "call_audio_filetype": "wav",
    "call_link": "gs://voice_mail/" + destFileName,
    "process_status" : "new",
    "transcript": transcript,
    "sentiment" : "",
    "sentiment_score" : 0,
    "sentiment_magnitude" : 0,
    "latitude": latitude,
    "longitude": longitude,
    "geohash": "",
    "username": userName
  }

  try {
    const { data, status } = await astraClient.post(uri, body);

    if (status == 201) {
      // Successful call
      return {
        statusCode: status,
        time_uuid: time_uuid
      };
    } else {
      // REST call to the Astra database failed
      return {
        statusCode: status,
        message: "writeAstraRecord: error writing to the Astra DB"
      };
    }
  } catch (error) {
    console.error(error);
  }
};

/**
 * Update the Astra database with the recording info
 * @param destFileName The name of the file
 */
 async function updateCallRecord(call_id, body) {
   console.log("updateAstra() call_id = " + call_id + ", body = " + JSON.stringify(body));
  const uri = basePath + "/message/" + call_id;
  // create an Astra DB client
  const astraClient = await createClient({
    astraDatabaseId: process.env.ASTRA_DB_ID,
    astraDatabaseRegion: process.env.ASTRA_DB_REGION,
    applicationToken: process.env.ASTRA_DB_TOKEN
  });

  try {
    // Updates to specific fields are done with a PATCH
    const { data, status } = await astraClient.patch(uri, body);

    if (status == 200) {
      // Successful call
      console.log("updateCallRecord() success!");
      return {
        statusCode: status,
        data: data,
        message: "Successfuly updated the record"
      };
    } else {
      // REST call to the Astra database failed
      return {
        statusCode: status,
        message: "Update failed"
      };
    }
  } catch (error) {
    console.log("updateCallRecord() threw an error:");
    console.error(error);
  }
};


/**
 * Transcribe the given file to its text format
 * @param {String} gcsUri URI to the 
 * @param {SpeechClient} client The google speech client
 * @return {String} The transcribed text
 */
async function transcribe(gsUri, client) {
  // The path to the remote LINEAR16 file
  // const gcsUri = 'gs://cloud-samples-data/speech/brooklyn_bridge.raw';
  console.log("transcribe() - TOP");
  console.log("gsUri = " + gsUri);

  // The audio file's encoding, sample rate in hertz, and BCP-47 language code
  const audio = {
    uri: gsUri,
  };
  const config = {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'en-US',
  };
  const request = {
    audio: audio,
    config: config,
  };

  // Detects speech in the audio file
  console.log("transcribe() - about to recognize...");
  let transcription = "";
  try {
    const [response] = await client.recognize(request);
    transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    console.log(`Transcription: ${transcription}`);
  } catch (error) {
    console.error(error);
  }
  return transcription;
};