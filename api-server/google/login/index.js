const escapeHtml = require('escape-html');
const crypto = require('crypto-js');
var SHA256 = require("crypto-js/sha256");

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.login = (req, res) => {
    // Logging in must be done via POST
    if(req.method == 'POST') {
        // First we extract the provided username and password
        let username = req.body.username;
        let password = req.body.password;

        // SHA256 encrypt the plain-text password
        password = SHA256(password);

        console.log('password encrypted to ' + password);
        // Now call Astra to ensure this record exists. If it does, the call will return a UUID
        // for the user

    }
    
  let message = req.query.message || req.body.message || 'login!';
  res.status(200).send(message);
};