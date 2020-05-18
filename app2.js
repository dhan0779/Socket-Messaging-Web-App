#!/usr/bin/nodejs

var cookieSession = require('cookie-session')
var express = require('express')
var path = require('path')
var app = express();
var hbs = require('hbs');
var server  = require('http').createServer(app);
var io = require('socket.io')(server);
var request = require('request')
var simpleoauth2 = require("simple-oauth2")
var mysql = require('mysql');

// -------------- express initialization -------------- //
// PORT SETUP - NUMBER SPECIFIC TO THIS SYSTEM
server.listen(process.env.PORT || 8080);   
app.set('view engine','hbs');
app.use(express.static(path.join(__dirname,"public")));

sqlParams = {
  connectionLimit : 10,
  user            : 'site_dhan',
  password        : '*****************',
  host            : 'mysql1.csl.tjhsst.edu',
  port            : 3306,
  database        : 'site_dhan'
}
var pool  = mysql.createPool(sqlParams);

app.use(cookieSession({
    name: 'mycookie',
    keys: ['*************', '**************']
}))

var ion_client_id = '*******************';
var ion_client_secret ='*********************';
var ion_redirect_uri = 'https://dhan.sites.tjhsst.edu/login_worker';

var oauth2 = simpleoauth2.create({
    client: {
        id: ion_client_id,
        secret: ion_client_secret,
    },
    auth: {
        tokenHost: 'https://ion.tjhsst.edu/oauth/',
        authorizePath: 'https://ion.tjhsst.edu/oauth/authorize',
        tokenPath: 'https://ion.tjhsst.edu/oauth/token/'
    }
});

var authorizationUri = oauth2.authorizationCode.authorizeURL({
        scope: "read",
        redirect_uri: ion_redirect_uri
});

var res_object;
var user_counter = 0;
app.get('/', function(req, res){
    if (!('token' in req.session)) {
        res.redirect("https://dhan.sites.tjhsst.edu/login");
    } else {
        var access_token = req.session.token.access_token;
        var my_ion_request = 'https://ion.tjhsst.edu/api/profile?format=json&access_token='+access_token;
        request.get( {url:my_ion_request}, function (e, r, body) {
            res_object = JSON.parse(body);
            console.log(res_object);
            req.app.locals.isLogin = true;
            //res.redirect('https://user.tjhsst.edu/2021dhan');
            res.render("index3", {'users':res_object.full_name , 'counter':user_counter})
        });
    }
})

async function handleCode(req, res, next) {
    theCode = req.query.code;
    var options = {
        'code': theCode,
        'redirect_uri': ion_redirect_uri,
        'scope': 'read'
     };
    try {
        var result = await oauth2.authorizationCode.getToken(options);
        var token = oauth2.accessToken.create(result);
        res.locals.token = token;
        next()
    } 
    catch (error) {
        console.log('Access Token Error', error.message);
        res.redirect("https://dhan.sites.tjhsst.edu")
        //res.send(502); // bad stuff, man
    }
}

app.get('/login_worker', [handleCode,function (req, res) {
    console.log(res.locals.token)
    req.session.token = res.locals.token.token;
    res.redirect('https://dhan.sites.tjhsst.edu/');
}])

app.get('/logout', function(req,res){
    req.session.token = undefined;
    res.redirect("https://dhan.sites.tjhsst.edu/login")
})

app.get('/login',function(req,res){
    req.session.token = undefined
    res.render("login_auth", {"oauth":authorizationUri})
})


io.on('connection', (socket)=>{
    console.log("New user connected!")
    user_counter+=1;
    socket.on('chat message', function(msg){
    io.emit('chat message', msg);
    console.log('message: ' + msg);
    socket.on('disconnect', function() {
      console.log('User disconnected!');
      user_counter-=1;
   });
  });
})

//sql endpoints 
app.get('/add_message',function(req,res){
    var user_name = req.query.name;
    var msg = req.query.m;
    console.log(user_name)
    console.log(msg)
    pool.query('INSERT INTO messages SET username=?, message=?',[user_name,msg], function (error, results, fields) {
      if (error) throw error;
        console.log("message added")
    });
});


