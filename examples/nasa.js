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


    self.getPhoto = function (sol, fn) {

        var max_sol = 1000; //getSOl is broken.
        var sol_date = Math.floor(Math.random() * max_sol);
        let url = 'https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?sol='+ sol_date +'&api_key='+ self.token
        debugger;
        console.log(url);
        request({url: url, json: true}, function (error, response, data) {
            debugger;
            if (error) {
                return fn(error);
            }
            if (response.statusCode !== 200) {
                return fn(new Error('unexpected status ' + response.statusCode));
            }
            let img_src = data.photos[0].img_src;
            let sol = data.photos[0].sol;
            let earth_date = data.photos[0].earth_date;
            let msg = {img_src: img_src,sol_number: sol,earth_date:earth_date};
            fn(null, msg);
        })
    }
}


