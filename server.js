var express = require('express');
var app = express();
var config = { redis: { host: '127.0.0.1', port: 6379, options: null}};
var acct = require('./acct')(config);
var dfile = require('./file')(config);

var knox = require('knox');

app.use(express.bodyParser({
  keepExtensions: true
}));

app.get('/', function(req,res) {
  res.send('I should list accounts');
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
  res.send(fileName);
  acct.get(req.params.acct, function(doc) {
    doc.bucket = 'fscat_' + req.params.acct;
    var client = knox.createClient(doc);
    client.putFile(filePath, filePath.split('/').pop(), function(err, res) {
      if(err) { return console.log(err) };
      dfile.set(req.params.acct + ':' + fileName, 
        { s3: filePath.split('/').pop() },
        function(err) {
          console.log('Saved to Redis!');
        });
    });
  });
});

app.get('/:acct/:name', function(req, res){
  // stream file to response
  acct.get(req.params.acct, function(doc) {
    doc.bucket = 'fscat_' + req.params.acct;
    var client = knox.createClient(doc);
    dfile.get(req.params.acct + ':' + req.params.name, function(doc){
      client.getFile(doc.s3, function(err, result) {
        res.writeHead(200, result.headers);
        result.on('data', function(chunk) {
          res.write(chunk);
        });
        result.on('end', function() {
          res.end;
        });
      });
    });
  });
});

app.del('/:acct/:name', function(req, res){
  // get account
  // delete file
});


app.listen(3000);
