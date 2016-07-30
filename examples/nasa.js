// NASA API https://api.nasa.gov/api.html#assets
var request = require('request');

module.exports = function (token) {
    return new Nasa(token)
}


function Nasa (token) {
    var self = this;
    self.token = token;

    getMaxSOL = function () {

        var max_sol_url = 'https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/?api_key='+ self.token
        request({url: max_sol_url, json: true}, function (error, response, data) {
            if (error) {
                return fn(error);
            }
            if (response.statusCode !== 200) {
                return fn(new Error('unexpected status ' + response.statusCode));
            }
            let max_sol = data.rover.max_sol;
            //not used now.
            let max_date = data.rover.max_date;
            return max_sol;
        })
    }


    self.getPhoto = function (sol_date, fn) {

        if (sol_date > getMaxSOL()) {
            fn(null, "Dieser SOL ist größer als die gespeicherten Daten.");
        }
        let url = 'https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?sol='+ sol_date +'&camera=NAVCAM&api_key='+ self.token
        request({url: url, json: true}, function (error, response, data) {
            if (error) {
                return fn(error);
            }
            if (response.statusCode !== 200) {
                return fn(new Error('unexpected status ' + response.statusCode));
            }
            let img_src = data.photos[0].img_src;
            let sol = data.photos[0].sol;
            let earth_date = data.photos[0].earth_date;
            let msg = {};
            fn(null, img_src);
        })
    }
}


