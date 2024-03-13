var express = require('express');
var app = express();
app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.post('/move-order-to-shipday', function (req, res) {
	console.log('moving order')
	console.log(req.body)
  res.send('Hello World!');
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

module.exports = app;