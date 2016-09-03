// Modified from https://github.com/mbrevoort/witbot-sample/
var request = require('request');
var parseString = require('xml2js').parseString;

module.exports = function (token) {
  return new Knoellchen(token)
}

function CatImagery (token) {
  var self = this;
  self.token = token;

  self.get = function (location, fn) {
    request({url: url/*, json: true*/}, function (error, response, data) {
      if (error) {
        console.log("error");
      }
      if (response.statusCode !== 200) {
        console.log("not http 200");
      }

      console.log("Cat requested and received.")
      parseString(data, function (err, result) {
        var msg = result.response.data[0].images[0].image[0].url[0];
        fn(null, msg);
      });
    })
  }
}