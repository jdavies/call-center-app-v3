// 'use strict';

const escapeHtml = require('escape-html');
const crypto = require('crypto-js');
var SHA256 = require("crypto-js/sha256");
var jwt = require('jsonwebtoken');
const { createClient } = require("@astrajs/rest");
const JWT_SECRET = 'a34Ft!';
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
exports.login = async (req, res) => {
    // Logging in must be done via POST
    console.log("login - TOP");
    console.log("basePath = " + basePath);

    if(req.method == 'POST') {
        // First we extract the provided username and password
        let username = req.body.username;
        let password = req.body.password;

        // SHA256 encrypt the plain-text password
        password = SHA256(password);

        console.log('password encrypted to ' + password);
        const result = await doLogin(username, password);
        res.statusCode = result.statusCode;
        if(result.statusCode == 200) {
          // Login succeeeded
          console.log("Login succeeded!");
          console.log("userid = " + result.userid);
          // Create a JSONWen Token to return to the user
          const token = jwt.sign({
            exp: Math.floor(Date.now() / 1000) + (60 * 60),
            userid: `${result.userid}`
          }, JWT_SECRET);
          res.end(JSON.stringify(`{"token": "${token}"`));
        } else {
          // Login failed
          console.log("Login failed");
          res.end('{"message": "Invalid login credentials."}');
        }
    }
};

// The password needs to be SHA256 hashed
async function doLogin(username, password) {
  console.log("doLogin- TOP");
  const uri = basePath + `/users/${escapeHtml(username)}/${escapeHtml(password)}?fields=userid`;
  console.log("uri = " + uri);
  // create an Astra DB client
  const astraClient = await createClient({
    astraDatabaseId: process.env.ASTRA_DB_ID,
    astraDatabaseRegion: process.env.ASTRA_DB_REGION,
    applicationToken: process.env.ASTRA_DB_TOKEN,
  });
  console.log("Astra client created...");
  const { data, status } = await astraClient.get(uri);
  if(status == 200) {
    // Success!
    console.log("data = " + data);
    console.log("data = " + JSON.stringify(data));
    console.log("data length = " + data.length);
    const user1 = data[0];
    console.log("user1.userid = " + user1.userid);
    return {
      statusCode: 200,
      userid: data[0].userid
    };
  } else {
    // Login failed
    return {
      statusCode: 401,
      body: JSON.stringify({
        userid: 0
        })
    };
  }
}