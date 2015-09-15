var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
app.use(cookieParser());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.get('/logout', function(req, res) {
  res.clearCookie('name');
  res.end('You\'re logged out!');
})

app.get('/', 
function(req, res) {
  console.log(req.cookies);
  util.checkUser(req.cookies.name, res, function() {
    res.render('index');
  });
});

app.get('/create', 
function(req, res) {
  util.checkUser(req.cookies.name, res, function() {
    res.render('create');
  });
});

app.get('/links', 
function(req, res) {
  util.checkUser(req.cookies.name, res, function() {
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    });
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          base_url: req.headers.origin
        })
        .then(function(newLink) {
          console.log('newlink');
          db.knex('urls')
            .select()
            .then(function(contents) {
              console.log(contents);
            });
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.post('/login', function(req, res){
  db.knex('users')
    .where('username', '=', req.body.username)
    .then(function(result){
      if(result[0] && result[0]['username']) {
        if(req.body.password === result[0]['password']) {
          var token = req.body.username;
          db.knex('tokens')
            .insert({'token': token, 'userid': result[0]['id']})
            .then(function(contents){
              res.cookie('name', token);
              res.writeHead(302, {'Location': '/'});
              res.end();
            });
          } else {
            res.writeHead(302, {'Location': '/login'});
            res.end();  
          }
        } else {
          res.writeHead(302, {'Location': '/login'});
          res.end();
        }
    });
});

app.post('/signup', function(req, res) {
  db.knex('users')
    .insert({'username': req.body.username, 'password': req.body.password})
    .then(function(result) {
      var token = req.body.username;
      db.knex('tokens')
        .insert({'token': token, 'userid': result[0]})
        .then(function(contents){
          db.knex('tokens')
            .select()
            .then(function(result) {
            })
          res.cookie('name', token);
          console.log(res.cookie)
          res.writeHead(302, {'Location': '/'});
          res.end();
        });
    });
});




/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  console.log('beep boop');
  console.log(req.cookies);
  console.log(req.params[0]);
  db.knex('urls')
    .select()
    .then(function(contents) {
      console.log(contents);
    });
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      console.log('weewoo');
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits')+1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
