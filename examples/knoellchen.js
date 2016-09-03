// Modified from https://github.com/mbrevoort/witbot-sample/
var request = require('request');
var parseString = require('xml2js').parseString;

module.exports = function () {
  return new Knoellchen()
}

function Knoellchen () {
  var self = this;

  self.get = function (location, fn) {
    console.log("GOT LOCATION", location);
    // test data
    // XVAL 6.939408
    // YVAL 50.93808
    let lon = encodeURIComponent(location.longitude)
    let lat = encodeURIComponent(location.latitude)
    var url = 'https://fmeserver.de/fmedatastreaming/Hackathon/Knoellchen2.fmw?XVAL='+lon+'&YVAL='+lat+'&DestDataset_JSON=C%3A%5CUsers%5Cclwi%5CDesktop%5CHackathon%5Cresponse.json&token=06b03f8eeac9cee1baa4a8505eb3578a5bbd2eeb'
    request({url: url, json: true}, function (error, response, data) {
      if (error) {
        return fn(error);
      }
      if (response.statusCode !== 200) {
        //return fn(new Error('unexpected status ' + response.statusCode));
        fn(null, "Für diesen Ort habe ich keine Daten.");
        return
      }

      var dangerRating = parseInt(data[0].Einwertung);
      var ticketAmount = data[0].Anzahl;
      var streetName = data[0].Strasse;

      var dangerStrings = [
          "sehr geringe",
          "eher geringe",
          "normal hohe",
          "eher hohe",
          "sehr hohe"
      ];

      var msg = 'Mit '+ticketAmount+' Knöllchen hat '+streetName+' eine '+ dangerStrings[dangerRating] +' Knöllchengefahr';

      fn(null, msg);
    })
  }
}