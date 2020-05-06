/**
 * This is an example of a basic node.js server side code that does authentication with Spotify.
 */

/*
THIS FIRST SECTION IS IMPORTANT.
This is where you need to place the Client ID and the Client Secret
of your Spotify app. Replace the existing ones with yours.

You don't need to change the redirect_uri for now, but 
you need to copy its value from here to the App Settings in the Spotify dashboard. 
Make sure what you set it to in the Spotify dashboard matches exactly
what you have here in the redirect_uri variable. 

Read more on creating a Spotify app, getting the client id & secret 
and the redirect_uri here: 
https://developer.spotify.com/documentation/general/guides/app-settings/
*/
var client_id = '8f8d13ef76d34d9d80a3f23ca6b64646'; // Your client id
var client_secret = '7c3a3d4b98ef4b63b2ec26346a154076'; // Your secret
var redirect_uri = 'http://209.97.159.185/ShareYourSound'; // Your redirect uri

/* End of important section ^.^ */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var cookieParser = require('cookie-parser');
//var utils = require('./spotify_utils')

var stateKey = 'spotify_auth_state';
var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.set('view engine', 'ejs');

// The index page of our website will be the Login with Spotify page.
app.get('/', function(req, res) {
  res.render('index.html', {})
})

// This is the API endpoint we call when the user clicks on the "Login with Spotify" button.
// Check out login.ejs, line 12.
app.get('/authenticate', function(req, res) {
  var state = utils.generateRandomString(16);
  res.cookie(stateKey, state);

  // This is where we define the user permissions we need.
  // The user will see these permissons we're requesting on the Spotify login page.
  var scope = 'user-read-private user-read-email, streaming';

  // This is where we're making the API request to Spotify, asking them to re-direct us 
  // to their login page. Notice how we add a few parameters - our Spotify app client id, 
  // the user permissions we just set, and a few other things.
  res.redirect('https://accounts.spotify.com/authorize?' + 
    'response_type=code' +  '&client_id=' + client_id +
    '&scope=' + scope + 
    '&redirect_uri=' + redirect_uri + 
    '&state=' + state);
});

// Once the user is taken to the Spotify Login page and logs in successfully,
// Spotify calls this endpoint on our API. That's why we have to define it in the
// app settings dashboard. 
// The request Spotify sends to this endpoint will tell us if the login was successful or not. 
// For successful logins, we receive a code, which we use to ask Spotify API for a token.
// Once we get that token, we use it in all our future requests to the Spotify API
// in order to confirm our identity.

app.get('/spotify_callback', function(req, res) {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#error=state_mismatch');
  } else {
    res.clearCookie(stateKey);

    // This is where we're building the request for a token.
    // Notice we're submitting the request to https://accounts.spotify.com/api/token,
    // and we're adding some data to it: the code we just received, our redirect_uri,
    // as well as our app client id and client secret.
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: { code: code, redirect_uri: redirect_uri, grant_type: 'authorization_code' },
      headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
      json: true
    };

    // This makes the post request we've defined above.
    // It's literally the same thing as $.ajax() or http.request()
    // but using a different library.
    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        // The request for a token was successful, and the token
        // lives inside body.access_token. All we need to do now is pass it 
        // forward to our frontend javascript, in order to "sign" or "authenticate"
        // our future Spotify API requests with it.
        console.log('Login successful!')
        var access_token = body.access_token

        // We pass the token to the frontend by adding it as a hash to the URL.
        // We have access to this URL hash in the browser.   
        // This res.redirect makes the server execute line 118 and therefore render profile.ejs.
        res.redirect('/profile#' + access_token )
      } else {
        console.log('Login failed!')
      }
    });
  }
});

// Once the user logs in, they will be redirected to this profile page.
app.get('/profile', function(req, res) {
  res.render('profile.ejs')
})

console.log('Listening on 3000');
app.listen(3000);
