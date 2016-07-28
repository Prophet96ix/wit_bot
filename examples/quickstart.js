'use strict';

let Wit = null;
try {
    // if running from repo
    Wit = require('../').Wit;
} catch (e) {
    Wit = require('node-wit').Wit;
}

var weather = require('./weather')('7444333da54fa1b03a38b704be42e170');

const accessToken = (() => {
    if (process.argv.length !== 3) {
        console.log('usage: node examples/quickstart.js <wit-access-token>');
        process.exit(1);
    }
    return process.argv[2];
})();

// Quickstart example
// See https://wit.ai/ar7hur/quickstart

const firstEntityValue = (entities, entity) => {
    const val = entities && entities[entity] &&
        Array.isArray(entities[entity]) &&
        entities[entity].length > 0 &&
        entities[entity][0].value;
    if (!val) {
        return null;
    }
    return typeof val === 'object' ? val.value : val;
};

const actions = {
    send(request, response) {
        const { sessionId, context, entities } = request;
        const { text, quickreplies } = response;
        return new Promise(function(resolve, reject) {
            console.log('sending...', JSON.stringify(response));
            return resolve();
        });
    },
    getForecast({ context, entities }) {
        return new Promise(function(resolve, reject) {

            var location = firstEntityValue(entities, 'location')
            if (location) {
                weather.get(location, function(error, msg) {
                    if (error) {
                        console.error(error);
                        //let the bot say there was an error
                        return reject(error);
                    }
                    context.forecast = msg;
                    //do not need missingLocation if we have it
                    delete context.missingLocation;
                    return resolve(context);
                });
            } else {
                //goto other branch to get a location
                context.missingLocation = true;
                delete context.forecast;
                return resolve(context);
            }
            delete context.missingLocation;
            delete context.forecast;
        });
    },
};

const client = new Wit({ accessToken, actions });
client.interactive();

//telegram token 216516492:AAFyv5D1w8kOv9zn7Rsm5Yr9p_lzerIENWs