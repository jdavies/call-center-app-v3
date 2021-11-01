'use strict';

const { createWriteStream } = require("fs");
const path = require("path");
const { Storage } = require("@google-cloud/storage");
const speech = require('@google-cloud/speech');
const language = require('@google-cloud/language');
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
        } catch(err) {
          console.log("POST caught an error: " + err);
        }
      } else if (req.method == 'GET') {
        // Netlify is polling the status of an upload
        // Get the ID of the record we want
        const call_id = req.url.replace('/', '');
        if(call_id.length > 0) {
          // Get a single call message
          // Get the recent massages
          const message = await getMessage(call_id);
          res.status(message.statusCode).send(message.data);
        } else {
          // Get the recent messages
          const message = await getRecentMessages(10);
          res.status(message.statusCode).send(message.data);
        }
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

  const bucketName = "voice_mail";
  const voiceFilesBucket = gc.bucket(bucketName);

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
    if(result.statusCode == 201) {
      // Successfully wrote to the Astra DB.
      // Now lets start the transcription of the file
      call_id = result.time_uuid;
      // Creates a trnascription client
      const speechClient = new speech.SpeechClient();
      transcription = await transcribe(voiceFileURI, speechClient);
      let updateBody = {"transcript" : transcription};

      // Wait unti the transcription is complete.
      await updateCallRecord(call_id, updateBody);

      // Perform the sentiment analysis
      const languageClient = new language.LanguageServiceClient();
      const document = {
        content: transcription,
        type: 'PLAIN_TEXT',
      };

      // Update the Astra DB to show that the anaylsis is ocurring
      updateBody = {"process_status" : "gcp_transcribe_scheduled"};
      await updateCallRecord(call_id, updateBody);

      const [analysis] = await languageClient.analyzeSentiment({document});

      const sentiment = analysis.documentSentiment;
      const sentimentDescription = calculateSentimentDescription(sentiment.score, sentiment.magnitude);
      console.log(`Document sentiment: ${sentimentDescription}`);
      console.log(`  Score: ${sentiment.score}`);
      console.log(`  Magnitude: ${sentiment.magnitude}`)
      
      // Write the analysis results to the Astra database
      updateBody = { 
        "sentiment" : sentimentDescription,
        "sentiment_score" : sentiment.score, 
        "sentiment_magnitude" : sentiment.magnitude, 
        "process_status": "gcp_complete"
      };
      let updateResult = await updateCallRecord(call_id, updateBody);
      console.log(`updateBody = ${JSON.stringify(updateBody)}, statusCode = ${updateResult.statusCode}`);
    } else {
      // There was an error writing to Astra!
      console.log("Error writing to Astra DB: " + JSON.stringify(result));
    }
  } catch {
    console.log(console.error);
  }

  res.statusCode = 201;
  const responseMessage = `{"message": "File uploaded!", "call_id": "${call_id}", "transcription" : "${transcription}" }`;
  res.end(responseMessage);
}

/**
 * 
 * @param {*} score A value from -1.0 (negative) to 1.0 (positive)
 * @param {*} magnitude A value from 0 to infinity showing the emphasis
 * @return {String} A plain text description of the sentiment.
 * ie. Clearly positive, Clearly negative, etc.
 */
function calculateSentimentDescription(score, magnitude) {
  let theMag = "";
  let theScore = "";

  if(magnitude < 1.0) {
    theMag = "Somewhat";
  } else if(magnitude < 2.0) {
    theMag = "Seemingly";
  } else if(magnitude < 3.5) {
    theMag = "Very";
  } else {
    theMag = "Clearly";
  }

  if(score <= -0.8) {
    theScore = "Angry";
  } else if(score <= -0.4) {
    theScore = "Unhappy";
  } else if(score < -0.2) {
    theScore = "Dissatisfied";
  } else if(score < 0.2) {
    theScore = "Neutral";
  } else if(score < 0.4) {
    theScore = "Positive";
  } else if(score < 0.8) {
    theScore = "Happy";
  } else {
    theScore = "Delighted";
  }
  return `${theMag} ${theScore}`;
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
  const currentDate = new Date();
  let ts = Date.now();
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
    "last_updated" : ts,
    "last_updated_text": currentDate.toString(),
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
}

/**
 * Update the Astra database with the recording info
 * @param destFileName The name of the file
 */
 async function updateCallRecord(call_id, body) {
  const uri = basePath + "/message/" + call_id;
  // create an Astra DB client
  const astraClient = await createClient({
    astraDatabaseId: process.env.ASTRA_DB_ID,
    astraDatabaseRegion: process.env.ASTRA_DB_REGION,
    applicationToken: process.env.ASTRA_DB_TOKEN
  });

  // Modify the body to contain time stamp fields
  const currentDate = new Date();
  let ts = Date.now();
  
  body.last_updated = ts;
  body.last_updated_text = currentDate.toString();

  try {
    // Updates to specific fields are done with a PATCH
    const { data, status } = await astraClient.patch(uri, body);

    if (status == 200) {
      // Successful call
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
}


/**
 * Transcribe the given file to its text format
 * @param {String} gcsUri URI to the 
 * @param {SpeechClient} client The google speech client
 * @return {String} The transcribed text
 */
async function transcribe(gsUri, client) {
  // The path to the remote LINEAR16 file
  // const gcsUri = 'gs://cloud-samples-data/speech/brooklyn_bridge.raw';

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
  let transcription = "";
  try {
    const [response] = await client.recognize(request);
    transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
  } catch (error) {
    console.error(error);
  }
  return transcription;
};

async function getMessage(call_id) {
  const uri = basePath + "/message/" + call_id;
  // create an Astra DB client
  const astraClient = await createClient({
    astraDatabaseId: process.env.ASTRA_DB_ID,
    astraDatabaseRegion: process.env.ASTRA_DB_REGION,
    applicationToken: process.env.ASTRA_DB_TOKEN
  });
  
  try {
    // Read the message from the Astra database
    const { data, status } = await astraClient.get(uri);

    if (status == 200) {
      // Successful call
      return {
        statusCode: status,
        data: data[0],
        message: "Successfuly retrieved the record"
      };
    } else {
      // REST call to the Astra database failed
      return {
        statusCode: status,
        message: "getMessage() failed"
      };
    }
  } catch (error) {
    console.log("getMessage() threw an error:");
    console.error(error);
  }
}

/**
 * Get the most recent messages
 * @param {Integer} num_messages The maximum number of mesages to return
 * @returns 
 */
async function getRecentMessages(num_messages) {
  const uri = basePath + `/message/rows?page-size=${num_messages}`;
  // create an Astra DB client
  const astraClient = await createClient({
    astraDatabaseId: process.env.ASTRA_DB_ID,
    astraDatabaseRegion: process.env.ASTRA_DB_REGION,
    applicationToken: process.env.ASTRA_DB_TOKEN
  });
  
  try {
    // Read the message from the Astra database
    const { data, status } = await astraClient.get(uri);

    if (status == 200) {
      // Successful call
      console.log("data = " + JSON.stringify(data));
      return {
        statusCode: status,
        data: data,
        message: "Successfuly retrieved the records"
      };
    } else {
      // REST call to the Astra database failed
      return {
        statusCode: status,
        message: "getRecentMessages() failed"
      };
    }
  } catch (error) {
    console.log("getRecentMessages() threw an error:");
    console.error(error);
  }
}