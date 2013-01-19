var express = require('express');
var app = express();
var config = { redis: { host: '127.0.0.1', port: 6379, options: null}};
var acct = require('./acct')(config);
var dfile = require('./file')(config);
var fs = require('fs');

var knox = require('knox');

app.use(express.favicon());
app.use(express.bodyParser({
  keepExtensions: true
}));
app.use(express.logger('dev'));

app.get('/', function(req,res) {
  res.send("Welcome to fscat\n--------------------\nhttps://github.com/twilson63/fscat");
});

app.get('/:acct', function(req, res) {
  acct.get(req.params.acct, function(doc) {
    res.send(doc);
  });
});

app.post('/:acct', function(req,res) {
  // {key, secret, fileTypes, max}
  req.body.id = req.params.acct;
  acct.set('new', req.body, function(err, doc) {
    if (err) { res.send(err); }
    res.send(doc);
  });
});

app.del('/:acct', function(req, res) {
  acct.del(req.params.acct, function(doc) {
    res.send(doc);
  });
});

app.post('/:acct/upload', function(req,res) {
  var file = req.files[Object.keys(req.files)[0]];
  var filePath = file.path;
  var fileName = file.name.split(' ').join('_');
  var key = req.params.acct + ':' + fileName;
  var s3 = filePath.split('/').pop();

  var deleteTempFile = function() {
    fs.unlink(filePath, function (err) {
      if (err) { return console.log(err) };
      console.log('successfully deleted ' + filePath);
    });    
  }

  var saveFileData = function(err, res) {
    if(err) { return console.log(err) };
    dfile.set( key, { s3: s3 }, function(err) {
      if (err) { return console.log(err); }
      // remove temp file
      deleteTempFile();
    });
  };

  res.send(fileName);
  acct.get(req.params.acct, function(doc) {
    doc.bucket = 'fscat_' + req.params.acct;
    var client = knox.createClient(doc);
    client.putFile(filePath, s3, saveFileData);
  });
});

app.get('/:acct/:name', function(req, res){
  var streamResponse = function(err, s3Object) {
    if (err) { res.send('ERROR'); }
    res.writeHead(200, s3Object.headers);
    s3Object.on('data', function(chunk) {
      res.write(chunk);
    });
    s3Object.on('end', function() {
      res.end();
    });
  }
  // stream file to response
  acct.get(req.params.acct, function(doc) {
    doc.bucket = 'fscat_' + req.params.acct;
    var client = knox.createClient(doc);
    dfile.get(req.params.acct + ':' + req.params.name, function(doc){
      if (!doc) { return res.send('File Not Found'); }
      client.getFile(doc.s3, streamResponse);
    });
  });
});

// app.del('/:acct/:name', function(req, res){
//   // get account
//   // delete file
// });

app.listen(3000);
