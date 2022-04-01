/**
 * This is an example of a basic node.js script that performs
 * the Client Credentials oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#client_credentials_flow
 */

const express = require('express');
const request = require('request');
var querystring = require('querystring');


var client_secret = '020a2844ec5f434db01406ed6a17f0a8'; // Your secret
var client_id = '0aea7708ec1a404684a40358ee7180e2';
var redirect_uri = 'http://localhost:8888/callback';

var generateRandomString = function(length) {
var text = '';
var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

for (var i = 0; i < length; i++) {
  text += possible.charAt(Math.floor(Math.random() * possible.length));
}
return text;
};

var app = express();
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
const port = process.env.PORT || 8888;

if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('./scratch');
}

app.get('/', (req, res) => {
  res.send('Hi');
})

app.get('/callback', (req, res) => {
  var code = req.query.code || null;
  var state = req.query.state || null;

  if (state === null) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };
  }

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {

      var access_token = body.access_token,
          refresh_token = body.refresh_token;

      var options = {
        url: 'https://api.spotify.com/v1/me/top/artists',
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
      };

      // use the access token to access the Spotify Web API
      request.get(options, function(error, response, body) {
        if(!error) {
          const data = body;
          console.log(data);
          
          for (var i = 0; i<5; i++) {
            localStorage.setItem("artist" + (i+1),data.items[i].name);
          }
          res.redirect('game');
        }
      });

    } else {
      res.redirect('/#' +
        querystring.stringify({
          error: 'invalid_token'
        }));
    }
  });
  
})
 
app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  var scope = 'user-top-read';
  console.log(state);

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      state: state,
      redirect_uri: redirect_uri,
    }));
});

app.get('/game', (req, res) => {
  res.render('game');
})

app.listen(port);