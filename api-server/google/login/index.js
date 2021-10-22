'use strict';

const escapeHtml = require('escape-html');
const crypto = require('crypto-js');
var SHA256 = require("crypto-js/sha256");
const cors = require('cors')({ origin: 'https://call-center-605a88.netlify.app' });
var jwt = require('jsonwebtoken');
const { createClient } = require("@astrajs/rest");
const JWT_SECRET = 'a34Ft!';
const basePath = `/api/rest/v2/keyspaces/${process.env.KEYSPACE}`;
// const express = require('express');
// const app = express();
// app.use(cors());
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
exports.login = async (req, res) => {
  // Logging in must be done via POST
  cors(req, res, async () => {
    // res.status(200).send({ ...req.headers })
    console.log("login - TOP");
    console.log("basePath = " + basePath);
    console.log("LOCAL_DC = " + process.env.LOCAL_DC);
    console.log("LOCAL_DC2 = " + process.env['LOCAL_DC']);
    res.header('Access-Control-Allow-Origin', 'https://call-center-605a88.netlify.app'); // Allow for CORS
    res.header('Access-Control-Allow-Methods', 'POST'); // Allow for CORS on POST
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    if (req.method == 'POST') {
      // First we extract the provided username and password
      let username = req.body.username;
      let password = req.body.password;

      // SHA256 encrypt the plain-text password
      password = SHA256(password);

      const result = await doLogin(username, password);
      res.statusCode = result.statusCode;

      if (result.statusCode == 200) {
        // Login succeeeded
        console.log("Login succeeded!");
        // Create a JSONWeb Token to return to the user
        const token = jwt.sign({
          exp: Math.floor(Date.now() / 1000) + (60 * 60),
          userid: `${result.userid}`
        }, JWT_SECRET);
        // cors(req, res, () => 
        //   res.end(JSON.stringify(`{"token": "${token}"`))
        // );
        res.end(JSON.stringify(`{"token": "${token}"`));
      } else {
        // Login failed
        console.log("Login failed");
        res.end('{"message": "Invalid login credentials."}');
      }
    }
  });
  res.set('Access-Control-Allow-Origin', 'https://call-center-605a88.netlify.app');
  res.header('Access-Control-Allow-Origin', 'https://call-center-605a88.netlify.app/');
};

// The password needs to be SHA256 hashed
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