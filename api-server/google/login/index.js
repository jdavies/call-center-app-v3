const escapeHtml = require('escape-html');
const crypto = require('crypto');
const hash = crypto.createHash('sha256');

/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.login = (req, res) => {
    // Is the Crypto package available?
    let crypto;
    try {
        crypto = await import('crypto');

        // Yes,crypto is available and ready
        console.log('crypto support is ENABLED!');

    } catch (err) {
        console.log('crypto support is disabled!');
    }
    // Logging in must be done via POST
    if(req.method == 'POST') {
        // First we extract the provided username and password
        let username = req.body.username;
        let password = req.body.password;

        // SHA256 encruypt the plain-text password
        password = crypto.createHash("sha256").update(password).digest("hex");

        console.log('password encrypted to ' + password);
        // Now call Astra to ensure this record exists. If it does, the call will return a UUID
        // for the user

    }
    
  let message = req.query.message || req.body.message || 'login!';
  res.status(200).send(message);
};