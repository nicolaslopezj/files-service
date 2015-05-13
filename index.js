var fs = require('fs');
var express = require('express');
var rand = require('generate-key');
var formidable = require('formidable');
var _ = require('underscore');

var app = express();
var token = process.env.FILES_API_TOKEN;
var uploadDir = process.env.UPLOAD_DIR;

// Constants
var PORT = 8080;

var keys = [];

app.post('/key', function (req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (!req.headers || !req.headers.authorization) {
    console.log('Client tried to request a key without a token');
    var json = JSON.stringify({ error: 'no-token', description: 'The token is required' }, null, 2);
    res.status(400).send(json);
    return;
  }

  var clientToken = req.headers.authorization.replace('Bearer ', '');

  if (token !== clientToken) {
    console.log('Unauthorized client tried to request a key [' + clientToken + ']');
    var json = JSON.stringify({ error: 'invalid-token', description: 'The token is invalid' }, null, 2);
    res.status(401).send(json);
    return;
  }

  var newKey = rand.generateKey(30);
  keys.push(newKey);

  var response = {
    key: newKey
  }

  var json = JSON.stringify(response, null, 2);
  res.send(json);

  console.log('Client requested new key [' + newKey + ']');
});


app.post('/files', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  var requestKey = req.query.key;

  if (!_.contains(keys, requestKey)) {
    console.log('Unauthorized client tried to upload a file [' + requestKey + ']');
    var json = JSON.stringify({ error: 'invalid-token', description: 'The token is invalid' }, null, 2);
    res.status(401).send(json);
    return;
  } 

  var form = new formidable.IncomingForm();
  form.uploadDir = uploadDir;
  form.maxFieldsSize = 10 * 1024 * 1024; // 10 mb
  form.keepExtensions = true;

  form.parse(req, function(err, fields, files) {
    if (err) {
      console.log('Error processing upload form [' + err.message + ']');
      var json = JSON.stringify({ error: 'form-error', description: 'There was an error processing the form' }, null, 2);
      res.status(401).send(json);
      return;
    }

    if (!_.has(files, 'file')) {
      console.log('Error uploading file: file is not in the file key');
      var json = JSON.stringify({ error: 'form-error', description: 'File must be in the file key' }, null, 2);
      res.status(401).send(json);
      return;
    }

    var file = {
      path: _.last(files.file.path.split('/')),
      type: files.file.type,
      name: files.file.name,
      size: files.file.size
    }

    console.log('File uploaded [' + file.path + '] (' + file.size + ' bytes)');

    res.send(JSON.stringify(file, null, 2));
    keys = _.without(keys, requestKey);
  });

});

app.get('/files/:path', function(req, res) {
  console.log('File requested [' + req.params.path + ']');

  var filePath = uploadDir + '/' + req.params.path
  if (fs.existsSync(filePath)) {
    res.sendfile(filePath);
  } else {
    console.log('File requested does not exists [' + req.params.path + ']');
    res.setHeader('Content-Type', 'application/json');
    var json = JSON.stringify({ error: 'file-not-found', description: 'The file was not found' }, null, 2);
    res.status(404).send(json);
    return;
  }
})

app.delete('/files/:path', function (req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (!req.headers || !req.headers.authorization) {
    console.log('Client tried to delete a file without a token');
    var json = JSON.stringify({ error: 'no-token', description: 'The token is required' }, null, 2);
    res.status(400).send(json);
    return;
  }

  var clientToken = req.headers.authorization.replace('Bearer ', '');

  if (token !== clientToken) {
    console.log('Unauthorized client tried to delete a file [' + clientToken + ']');
    var json = JSON.stringify({ error: 'invalid-token', description: 'The token is invalid' }, null, 2);
    res.status(401).send(json);
    return;
  }

  var filePath = uploadDir + '/' + req.params.path;
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, function (err) {
      if (err) {
        var json = JSON.stringify({ error: 'delete-error', description: 'Error deleting file' }, null, 2);
        res.status(500).send(json);
        console.log('Error deleting file [' + err.message + ']');
      } else {
        var json = JSON.stringify({ status: 'ok', message: 'File deleted' }, null, 2);
        res.send(json);
        console.log('File deleted [' + req.params.path + ']');
      }
    });
    
  } else {
    var json = JSON.stringify({ error: 'file-not-found', description: 'The file was not found' }, null, 2);
    res.status(404).send(json);
    console.log('Error deleting file: file not found [' + req.params.path + ']');
  }
});

app.listen(PORT);
console.log('Running on http://localhost:' + PORT);