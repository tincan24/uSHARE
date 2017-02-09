var querystring = require('querystring');
var request = require('request');

function SpotifyApi() {}

var clientID = '211aae652e324de8b0237d55d0fa3030';
var clientSecret = '691fdcd98e054278aac41672f119f9dd';
var redirectURI = 'http://localhost:3000/spotifyTest/callback';
var scopes = 'playlist-modify-public';
var stateKey = 'spotify_auth_state';
var accessToken = '';
var refreshToken = '';

SpotifyApi.prototype = {
  
  setup: function() {},

  // Prompts user to login to spotify
  promptLogin: function(req, res) {
    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // Request authorization for app
    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: clientID,
        scope: scopes,
        redirect_uri: redirectURI,
        state: state
      }));
  },

  requestAccessToken: function(req, res) {
    // your application requests refresh and access tokens
    // after checking the state parameter
    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
      res.redirect('/#' +
        querystring.stringify({
          error: 'state_mismatch'
        }));
    } else {
      res.clearCookie(stateKey);
      var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
          code: code,
          redirect_uri: redirectURI,
          grant_type: 'authorization_code'
        },
        headers: {
          'Authorization': 'Basic ' + (new Buffer(clientID + ':' + clientSecret).toString('base64'))
        },
        json: true
      };

      request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {

          accessToken = body.access_token;
          refreshToken = body.refresh_token;

          var options = {
            url: 'https://api.spotify.com/v1/me',
            headers: { 'Authorization': 'Bearer ' + accessToken },
            json: true
          };

          // Use the access token to access the Spotify Web API
          // request.get(options, function(error, response, body) {
          //   console.log(body);
          // });

          // We can also pass the token to the browser to make requests from there
          res.redirect('/#' +
            querystring.stringify({
              access_token: accessToken,
              refresh_token: refreshToken
            }));
        } else {
          res.redirect('/#' +
            querystring.stringify({
              error: 'invalid_token'
            }));
        }
      });
    }
  }
};

// Generates a random string containing numbers and letters
function generateRandomString(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

module.exports = SpotifyApi;