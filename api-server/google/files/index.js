'use strict';

const escapeHtml = require('escape-html');
const { createWriteStream } = require("fs");
const path = require("path");
const { Storage } = require("@google-cloud/storage");
const stream = require('stream');
const cors = require('cors')({ origin: 'https://call-center-605a88.netlify.app' });
var jwt = require('jsonwebtoken');
const JWT_SECRET = 'a34Ft!';
const basePath = `https://us-west2-call-center-329523.cloudfunctions.net/files`;
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
    console.log("security file path: " + path.join(__dirname, "../call-center-329523-51a0ac5aac00.json"));
    console.log("--- HEADERS ---");
    console.log(req.headers);
    res.set('Access-Control-Allow-Origin', 'https://call-center-605a88.netlify.app'); // Allow for CORS

    if(req.method === 'OPTIONS') {
      console.log("OPTIONS called on login!");
      // Send response to OPTIONS requests
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
    } else if (req.method == 'POST') {
      // A voice recording is being uploaded from Netlify
      console.log("Uploading a file...");

      const gc = new Storage({
        keyFilename: "call-center-329523-51a0ac5aac00.json",
        projectId: "call-center-329523"
      });
      console.log("gc created!");

      const bucketName = "voice_mail";
      const voiceFilesBucket = gc.bucket(bucketName);
      console.log("got the bucket!");

      // var writeStream = voiceFilesBucket.file("test.txt").createWriteStream({
      //   resumable: false,
      //   gzip: true
      // });

      const destFileName = "test.txt";
      const file = voiceFilesBucket.file(destFileName);
      const passthroughStream = new stream.PassThrough();
      passthroughStream.write('input text');
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
        console.log("---end");
      } catch {
        console.log(console.error);
      }
      // console.log("writeStream created! - " + writeStream);

      // const result = await doLogin(username, password);
      // res.statusCode = result.statusCode;

      res.statusCode = 201;
      res.end('{"message": "File uploaded!"}');

      // if (result.statusCode == 200) {
      //   // Login succeeeded
      //   console.log("Login succeeded!");
      //   // Create a JSONWeb Token to return to the user
      //   const token = jwt.sign({
      //     exp: Math.floor(Date.now() / 1000) + (60 * 60),
      //     userid: `${result.userid}`
      //   }, JWT_SECRET);
      //   res.end(JSON.stringify(`{"jwt": "${token}"}`));
      // } else {
      //   // Login failed
      //   console.log("Login failed");
      //   res.end('{"message": "Invalid login credentials."}');
      // }
    }
  });
};

// TODO
async function doLogin(username, password) {
  const uri = basePath + `/users/${escapeHtml(username)}/${escapeHtml(password)}?fields=userid`;
  // create an Astra DB client
  const astraClient = await createClient({
    astraDatabaseId: process.env.ASTRA_DB_ID,
    astraDatabaseRegion: process.env.ASTRA_DB_REGION,
    applicationToken: process.env.ASTRA_DB_TOKEN,
  });

  const { data, status } = await astraClient.get(uri);
  if (status == 200) {
    // Successful call, but did the username and password match?
    if (data.length == 1) {
      // Good login
      return {
        statusCode: 200,
        userid: data[0].userid
      };
    } else {
      // Login failed
      return {
        statusCode: 401,
        userid: 0
      };
    }
  } else {
    // REST call to the Astra database failed
    return {
      statusCode: 500,
      body: JSON.stringify({
        userid: 0
      })
    };
  }
}