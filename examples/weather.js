// Modified from https://github.com/mbrevoort/witbot-sample/
var request = require('request');

module.exports = function (token) {
    return new Weather(token)
}

function Weather (token) {
    var self = this;
    self.token = token;

    self.get = function (location, fn) {
        var url = 'http://api.openweathermap.org/data/2.5/weather?q=' + location +
            '&units=metric&lang=de&APPID=' + self.token
        request({url: url, json: true}, function (error, response, data) {
            if (error) {
                return fn(error);
            }
            if (response.statusCode !== 200) {
                return fn(new Error('unexpected status ' + response.statusCode));
            }

            var currentConditions = data.weather[0].description;
            var currentTemp = data.main.temp;
            var city = data.name;
            var msg = 'Die Temperatur in ' + city + ' beträgt ' + currentTemp + '°C und es ist ' + currentConditions + '.';
            fn(null, msg);
        })
    }
}