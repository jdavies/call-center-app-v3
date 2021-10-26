'use strict';

const escapeHtml = require('escape-html');
const { createWriteStream } = require("fs");
const path = require("path");
const { Storage } = require("@google-cloud/storage");
const stream = require('stream');
const cors = require('cors')({ origin: 'https://call-center-605a88.netlify.app' });
var jwt = require('jsonwebtoken');
const { v1: uuidv1 } = require('uuid');
const { createClient } = require("@astrajs/rest");
const basePath = `/api/rest/v2/keyspaces/${process.env.KEYSPACE}`;

/**
 * Responds to a login request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 * 
 * A successful request will return a 200 statusCode
 * along with the userid object:
 * { "userid" : "<the user's UUID>" }
 * 
 * An unsuccessful attempt will return a 404 statusCode
 * with a message:
 * {"message": "Invalid login credentials."}
 */
exports.files = async (req, res) => {
  // File uploads are done via POST
  cors(req, res, async () => {
    console.log("Files - TOP");
    console.log("basePath = " + basePath);
    console.log('Lat,Long = ' + req.headers['x-appengine-citylatlong']);
    console.log('traceparent = ' + req.headers['traceparent']);
    res.set('Access-Control-Allow-Origin', 'https://call-center-605a88.netlify.app'); // Allow for CORS

    if(req.method === 'OPTIONS') {
      console.log("OPTIONS called on files/!");
      // Send response to OPTIONS requests
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
    } else if (req.method == 'POST') {
      // A voice recording is being uploaded from Netlify
      console.log("Uploading a file...");
      console.log("authorization = " + req.headers['authorization']);

      // Get the JWT
      const tokens = req.headers['authorization'].split(" ");
      const token = tokens[1];

      // Verify the token
      var decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("username = " + decoded.username);
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
        });

        console.log(`${destFileName} uploaded to ${bucketName}`);
      }

      try {
        console.log("---start");
        streamFileUpload();
        const latlong = req.headers['x-appengine-citylatlong'].split(",");
        const latitude = parseFloat(latlong[0]);
        const longitude = parseFloat(latlong[1]);
        console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
        // Now write the record to Astra DB
        writeAstraRecord(destFileName, decoded.username, latitude, longitude);
        console.log("---end");
      } catch {
        console.log(console.error);
      }

      res.statusCode = 201;
      res.end('{"message": "File uploaded!"}');
    }
  });
};

/**
 * Update the Astra database with the recording info
 * @param destFileName The name of the file
 */
async function writeAstraRecord(destFileName, userName, latitude, longitude) {
  const uri = basePath + "/message";
  // create an Astra DB client
  console.log('Creating the Astra client...');
  const astraClient = await createClient({
    astraDatabaseId: process.env.ASTRA_DB_ID,
    astraDatabaseRegion: process.env.ASTRA_DB_REGION,
    applicationToken: process.env.ASTRA_DB_TOKEN
  });

  console.log('Generating the time UUID');
  var time_uuid = uuidv1();
  console.log(`Time UUID = ${time_uuid}`);

  var body = { 
    "call_id" : time_uuid,
    "call_audio_filetype": "wav",
    "call_link": "gs://voice_mail/" + destFileName,
    "process_status" : "new",
    "sentiment" : "",
    "sentiment_score" : 0,
    "sentiment_magnitude" : 0,
    "latitude": latitude,
    "longitude": longitude,
    "geohash": "",
    "username": userName
  }

  console.log(`POSTing the data to ${uri}`);
  console.log("body = " + JSON.stringify(body));
  try {
    const { data, status } = await astraClient.post(uri, body);
    console.log('POST status = ' + status);

    if (status == 201) {
      // Successful call
      return {
        statusCode: status,
        time_uuid: data.call_id
      };
    } else {
      // REST call to the Astra database failed
      console.log("POST Failed. Status = "+ status)
      return {
        statusCode: status,
        body: JSON.stringify({
          time_uuid: 0
        })
      };
    }
  } catch (error) {
    console.error(error);
  }
};