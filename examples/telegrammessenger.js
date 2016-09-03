'use strict';
//https://blog.meinside.pe.kr/Implement-a-Speech-to-Text-Bot-Using-Wit-Ai-API/
// Messenger API integration example
// We assume you have:
// * a Wit.ai bot setup (https://wit.ai/docs/quickstart)
// * a Messenger Platform setup (https://developers.facebook.com/docs/messenger-platform/quickstart)
// You need to `npm install` the following dependencies: body-parser, express, request.
//
// 1. npm install body-parser express request
// 2. Download and install ngrok from https://ngrok.com/download
// 3. ./ngrok http 8445
// 4. WIT_TOKEN=your_access_token FB_APP_SECRET=your_app_secret FB_PAGE_TOKEN=your_page_token node examples/messenger.js
// 5. Subscribe your page to the Webhooks using verify_token and `https://<your_ngrok_io>/webhook` as callback URL.
// 6. Talk to your bot on Messenger!

//const bodyParser = require('body-parser');
//const crypto = require('crypto');
//const express = require('express');
const fetch = require('node-fetch');
const request = require('request');

var weather = require('./weather')('7444333da54fa1b03a38b704be42e170');
var nasa = require('./nasa')('mLQZ8n5hw0RVZLmYOEq45jYiAj5zpOHmXFTMi0HX');
var knoellchen = require('./knoellchen')();

const TelegramBot = require('node-telegram-bot-api');

let Wit = null;
let log = null;
try {
    // if running from repo
    Wit = require('../').Wit;
    log = require('../').log;
} catch (e) {
    Wit = require('node-wit').Wit;
    log = require('node-wit').log;
}


//Tokens
const WIT_TOKEN = 'BPZKG7XJC5HOFBAST2OLE2NDRHLJQCFV'; //'S4C57Y3N6ODQME4NTXZZ523EZOFOQY4X';
if (!WIT_TOKEN) {
    throw new Error('missing WIT_TOKEN') }
const TELEGRAM_TOKEN = '212581001:AAH8Dx8McV7KiXph-UxnJtCCOt_Q4KVnv_Q';
if (!TELEGRAM_TOKEN) {
    throw new Error('missing TELEGRAM_TOKEN') }


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


// ----------------------------------------------------------------------------
// Messenger API specific code

// See the Send API reference
// https://developers.facebook.com/docs/messenger-platform/send-api-reference

const fbMessage = (id, response) => {
  console.log(JSON.stringify(response));


  if(response.quickreplies)
  {

    var opts = {
          reply_markup: JSON.stringify({
            keyboard:[ response.quickreplies ],
            resize_keyboard: false,
            one_time_keyboard: true
            //inline_keyboard: [[{text: 'Test button', callback_data: 'test'}]]
          })
    };

    console.log("Original Opts: "+ JSON.stringify(opts));
    response.opts = opts;
  }
  console.log("Original Opts: "+ JSON.stringify(response.opts));

    return telegram.sendMessage(id, response.text, response.opts)
        .then(function(msg) {
            return msg;
        })
        .catch(function() {
            throw new Error("Something went wrong with the Telegram Message.");
        });
};

// ----------------------------------------------------------------------------
// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {id: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (session_id, telegram_username) => {
    let sessionId;
    // Let's see if we already have a session for the user session_id
    Object.keys(sessions).forEach(k => {
        if (sessions[k].id === session_id) {
            // Yep, got it!
            sessionId = k;
        }
    });
    if (!sessionId) {
        // No session found for user session_id, let's create a new one
        sessionId = new Date().toISOString();
        sessions[sessionId] = { id: session_id, context: {username: telegram_username, id: session_id}};
    }
    return sessionId;
};

// Our bot actions
const actions = {
    send({ sessionId }, response) {
        // Our bot has something to say!
        // Let's retrieve the Facebook user whose session belongs to
        const recipientId = sessions[sessionId].id;

        if (recipientId) {
            // Yay, we found our recipient!
            // Let's forward our bot response to her.
            // We return a promise to let our bot know when we're done sending
            console.log("Response in Action: "+ JSON.stringify(response));
            return fbMessage(recipientId, response)
                .then(() => null)
                .catch((err) => {
                    console.error(
                        'Oops! An error occurred while forwarding the response to',
                        recipientId,
                        ':',
                        err.stack || err
                    );
                });

        } else {
            console.error('Oops! Couldn\'t find user for session:', sessionId);
            // Giving the wheel back to our bot
            return Promise.resolve()
        }
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
    sendJoke({context, entities}) {
        return new Promise(function(resolve, reject) {
            //http://webknox.com/api#!/jokes/praise_GET
            var index = Math.floor(Math.random() * jokes.length);
            var randomQuote = jokes[index];
            context.joke = randomQuote.joke;;
            return resolve(context);
        });
    },
    /* getKnoellchenForecast */
    getData({context, entities}) {
      return new Promise(function (resolve, reject) {
        console.log("KnoellchenLocation:"+JSON.stringify(context));
        context.knoellchen = true;
        //need to delete a context at some point
        var locationButton = {
          text: "Standort mitteilen.",
          request_location: true
        };
        var opts = {
          reply_markup: JSON.stringify({
            keyboard:[[locationButton]],
            resize_keyboard: true,
            one_time_keyboard: true
            //inline_keyboard: [[{text: 'Test button', callback_data: 'test'}]]
          })
        };
        telegram.sendMessage(context.id, "Bitte teile mir Deinen Standort mit.", opts)
        .then(function(msg) {
          return resolve(context);
        })
        .catch(function() {
          throw new Error("Something went wrong with the Telegram Message.");
        });
      });
    },
    getWLan({context, entities}) {

        return new Promise(function (resolve, reject) {
          console.log("WLanLocation:"+JSON.stringify(context));
          context.WLanLocation = true;
          //need to delete a context at some point
          var locationButton = {
            text: "Standort mitteilen.",
            request_location: true
          };
          var opts = {
                reply_markup: JSON.stringify({
                  keyboard:[[locationButton]],
                  resize_keyboard: true,
                  one_time_keyboard: true
                  //inline_keyboard: [[{text: 'Test button', callback_data: 'test'}]]
                })
          };
              telegram.sendMessage(context.id, "Bitte teile mir Deinen Standort mit.", opts)
              .then(function(msg) {
                    return resolve(context);
              })
              .catch(function() {
                  throw new Error("Something went wrong with the Telegram Message.");
              });

        });
    },
    respondToFavorite({context, entities}) {

        return new Promise(function (resolve, reject) {
          telegram.sendChatAction(context.id, 'upload_photo')
          .then(function(msg) {
              console.log(msg);
          })
            nasa.getPhoto(1000, function(error, msg) {
                if (error) {
                    console.error(error);
                    //let the bot say there was an error
                    telegram.sendMessage(context.id,"Entschuldige, es ist etwas schief gelaufen. Versuch es einfach nochmal.");
                    return reject(error);
                }
                //need to delete a context at some point
                context.rover_photo = msg.img_src;
                context.myAction = 'sendPhoto';
                //Send the photo to telegram and wait for it.
                telegram.sendPhoto(context.id, request(context.rover_photo),{caption: 'SOL: '+msg.sol_number+' Datum:'+msg.earth_date})
                .then(function(msg) {
                    return resolve(context);
                })

            });
        });
    },
    start({context, entities}) {

        return new Promise(function (resolve, reject) {
            context.start = true;
            return resolve(context);
        });
    }
};

// Setting up our WIT bot
const wit = new Wit({
    accessToken: WIT_TOKEN,
    actions,
    logger: new log.Logger(log.DEBUG)
});

const telegram = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

telegram.on('location', function(msg) {
  console.log("Telegram on 'location':"+JSON.stringify(msg.location));;

  const msg_id = msg.chat.id;
  var username = msg.from.first_name;

  var sessionId = findOrCreateSession(msg_id, username);
  var context = sessions[sessionId].context
  if(context.WLanLocation)
  {
    telegram.sendChatAction(context.id, 'find_location')
    .then(function(msg) {
        console.log();
    })

    telegram.sendLocation(context.id, 51.9350264,7.6509148)
    .then(function(msg) {
      console.log("WLan location send.");
      delete context.WLanLocation;
    })
  }
  //if(context.knoellchen) {
    knoellchen.get(msg.location, function(error, msg) {
      if (error) {
        console.error(error);
        return reject(error);
      }
      telegram.sendMessage(context.id, msg)
        .then(function(msg) {
          return msg;
        })
        .catch(function() {
          throw new Error("Something went wrong with the Telegram Message.");
        });

    });
  //}
});

telegram.on('text', function(msg) {
    console.log("Telegram on 'message':"+JSON.stringify(msg));

    const msg_id = msg.chat.id;
    var username = msg.from.first_name;
    // We retrieve the user's current session, or create one if it doesn't exist
    // This is needed for our bot to figure out the conversation history
    const sessionId = findOrCreateSession(msg_id, username);


    const text = msg.text;
    // Let's forward the message to the Wit.ai Bot Engine
    // This will run all actions until our bot has nothing left to do
    wit.runActions(
        sessionId, // the user's current session
        text, // the user's message
        sessions[sessionId].context // the user's current session state
    ).then((context) => {

        if(context.start){
            delete context.start;
        }
        else if(context.myAction=='sendPhoto' && context.rover_photo)
        {

            delete context.myAction;
            delete context.rover_photo;
        }
        else if(context.joke)
        {
            delete context.joke;
        }

        if(context.forecast){
            delete context.forecast;
        }

        if (context['done']) {
            delete sessions[sessionId];
        }

        // Our bot did everything it has to do.
        // Now it's waiting for further messages to proceed.

        // Based on the session state, you might want to reset the session.
        // This depends heavily on the business logic of your bot.
        // Example:

        console.log('Waiting for next user messages:' + JSON.stringify(context));

        // Updating the user's current session state
        sessions[sessionId].context = context;
    })
        .catch((err) => {
            console.error('Oops! Got an error from Wit: ', err.stack || err);
        })

});

/*
 // Message handler
 app.post('/webhook', (req, res) => {
 // Parse the Messenger payload
 // See the Webhook reference
 // https://developers.facebook.com/docs/messenger-platform/webhook-reference
 const data = req.body;

 if (data.object === 'page') {
 data.entry.forEach(entry => {
 entry.messaging.forEach(event => {
 if (event.message) {
 // Yay! We got a new message!
 // We retrieve the Facebook user ID of the sender
 const sender = event.sender.id;

 // We retrieve the user's current session, or create one if it doesn't exist
 // This is needed for our bot to figure out the conversation history
 const sessionId = findOrCreateSession(sender);

 // We retrieve the message content
 const {text, attachments} = event.message;

 if (attachments) {
 // We received an attachment
 // Let's reply with an automatic message
 fbMessage(sender, 'Sorry I can only process text messages for now.')
 .catch(console.error);
 } else if (text) {
 // We received a text message

 // Let's forward the message to the Wit.ai Bot Engine
 // This will run all actions until our bot has nothing left to do
 wit.runActions(
 sessionId, // the user's current session
 text, // the user's message
 sessions[sessionId].context // the user's current session state
 ).then((context) => {
 // Our bot did everything it has to do.
 // Now it's waiting for further messages to proceed.
 console.log('Waiting for next user messages');

 // Based on the session state, you might want to reset the session.
 // This depends heavily on the business logic of your bot.
 // Example:
 // if (context['done']) {
 //   delete sessions[sessionId];
 // }

 // Updating the user's current session state
 sessions[sessionId].context = context;
 })
 .catch((err) => {
 console.error('Oops! Got an error from Wit: ', err.stack || err);
 })
 }
 } else {
 console.log('received event', JSON.stringify(event));
 }
 });
 });
 }
 res.sendStatus(200);
 });
 */
console.log("Running");

//http://www.blinde-kuh.de/witze/quatsch_3.html
var jokes = [
    {joke: 'Geht ein Zyklop zum Augearzt.'},
    {joke: "Lieber arm dran als Arm ab."},
    {joke: "Wo wohnen Katzen? Im Mietzhaus!"},
    {joke: "Was macht der Clown im Büro? Faxen!"},
    {joke: "Brechstangen sind aus Diebstahl gemacht."},
    {joke: "Sagt die Null zur Acht: „Schicker Gürtel!"},
    {joke: "Wie heißt das Reh mit Vornamen? Kartoffelpü."},
    {joke: "Was ist grün und hüpft durch den Wald? - Ein Rudel Gurken!"},
    {joke: "Was sitzt auf dem Baum und ruft: \"Ahhahh, ahhahh\"? - Ein Uhu mit Sprachfehler!"},
    {joke: "Was macht ein Jäger, wenn er eine Schlange sieht? - Er stellt sich hinten an."},
    {joke: "Was für eine Zeit ist gekommen, wenn ein Elefant auf einem Gartentor sitzt? - Die Zeit um ein neues Gartentor zu kaufen."},
    {joke: "Was gehört dir aber andere benutzen es am meisten? - Dein Name."},
    {joke: "Was passiert mit einem Engel, wenn er in einen Misthaufen fliegt? - Er bekommt Kotflügel."},
    {joke: "Was ist braun und schwimmt im Wasser? - Ein U-Brot."},
    {joke: "Was ist braun und sitzt hinter Gittern? - Eine Knastanie"},
    {joke: "Was ist Lila und sitzt in der Kirche ganz vorne? - Eine Frommbeere."},
    {joke: "Was ist braun und schaut durchs Fenster? - Ein Spannzapfen."},
    {joke: "Was ist schwarz und weiß und dreht sich immer im Kreis? - Ein Pinguin in einer Waschmaschine."},
    {joke: "Was ist weiß und steigt aus der Erde? - Ein Maulwurf im Nachthemd."},
    {joke: "Was ist grün und rennt im zickzack aus der Küche? - Der Fluchtsalat!"},
    {joke: "Was macht kcat kcit? - Eine Uhr im Rückwärtsgang!"},
    {joke: "Was steht mitten in Kassel? – ss."},
    {joke: "Warum macht die Biene summ? - Weil sie ihren Text vergessen hat."},
    {joke: "Warum ist die Schule eine Oase? - Nur Kamele wollen dorthin."},
    {joke: "Welcher Bus hat den Ozean überquert? - Kolumbus."},
    {joke: "Was ist gelb und kann nicht schwimmen? Ein Bagger! Warum kann ein Bagger nicht schwimmen? Weil er nur einen Arm hat!"},
    {joke: "Warum dürfen Elefanten nicht Rad fahren? - Weil sie keinen Daumen zum Klingeln haben."},
    {joke: "Welche Noten sind die beliebtesten? - Die Banknoten."},
    {joke: "Welche Kunden werden nie bedient? - Die Sekunden und Urkunden!"},
    {joke: "Was ist das Lieblings-Spiel von Katzen?? - MAU-MAU."},
    {joke: "Rollen zwei Tomaten über die Straße. Sagt die eine: \"Vorsicht, da vorne kommt ein Lastwatsch!"},
    {joke: "Was ist ein Cowboy ohne Pferd? - Ein Sattelschlepper."}
];

//Stuff to look at - NASA API
//https://api.nasa.gov/
