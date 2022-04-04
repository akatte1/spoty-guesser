const express = require('express');
const request = require('request');
const fs = require('fs');
var querystring = require('querystring');


var client_secret = '020a2844ec5f434db01406ed6a17f0a8';
var client_id = '0aea7708ec1a404684a40358ee7180e2';
var redirect_uri = 'https://spoty-guesser.herokuapp.com/callback';
var timeRange = 'long_term';
var timeRangeString = '';
var typeOfGuess = 'artists';

var user_data = [];
var user_track_data = [];

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
app.use(express.json());
app.use(express.urlencoded({extended: false}));
const port = process.env.PORT || 8888;

if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('./scratch');
}

app.get('/', (req, res) => {
  res.render('index');
})

app.post('/', async (req, res) => {
  timeRange = await req.body.time;
  typeOfGuess = await req.body.type;
  console.log(typeOfGuess)
  res.redirect('/login');
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
        url: 'https://api.spotify.com/v1/me/top/' + typeOfGuess + '?' + querystring.stringify({
          time_range: timeRange,
          limit: 5
        }),
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
      };

      request.get(options, function(error, response, body) {
        if(!error) {
          const data = body;
          
          for (var i = 0; i<5; i++) {
            if (typeOfGuess == "tracks") {
              user_data[i] = data.items[i].name;
              user_track_data[i] = data.items[i].artists[0].name;
            }
            else {
              user_data[i] = data.items[i].name;
            }
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

  switch(timeRange) {
    case "long_term":
      timeRangeString = "of all time";
      break;
    case "medium_term":
      timeRangeString = "of the past 6 months";
      break;
    case "short_term":
      timeRangeString = "of the past 4 weeks";
      break;
    default:
      break;
  }

  console.log(typeOfGuess)

  if (typeOfGuess == 'tracks') {
    res.render('game', {typeOfGuess: typeOfGuess,
                        timeRangeString: timeRangeString,
                        user_data: user_data,
                        user_track_data, user_track_data
      
    })
  }

  if (typeOfGuess == 'artists') {
    res.render('game', {typeOfGuess: typeOfGuess,
      timeRangeString: timeRangeString,
      user_data: user_data
    })
  }
})

app.listen(port);
