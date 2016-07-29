'use strict';

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

const bodyParser = require('body-parser');
const crypto = require('crypto');
const express = require('express');
const fetch = require('node-fetch');
const request = require('request');

var weather = require('./weather')('7444333da54fa1b03a38b704be42e170');

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
const WIT_TOKEN = 'S4C57Y3N6ODQME4NTXZZ523EZOFOQY4X';
if (!WIT_TOKEN) {
    throw new Error('missing WIT_TOKEN') }
const TELEGRAM_TOKEN = '216516492:AAFyv5D1w8kOv9zn7Rsm5Yr9p_lzerIENWs';
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

const fbMessage = (id, text) => {
    const body = JSON.stringify({
        recipient: { id },
        message: { text },
    })
    telegram.sendMessage(id, text);
    const qs = 'access_token=123';
    return fetch('https://graph.facebook.com/me/messages?' + qs, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body,
    })
        .then(rsp => rsp.json())
        .then(json => {

            return {"name":"Jim Cowart","location":{"city":{"name":"Chattanooga","population":167674},"state":{"name":"Tennessee","abbreviation":"TN","population":6403000}},"company":"appendTo"};
        });

   // return  ;
};

// ----------------------------------------------------------------------------
// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {id: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (session_id) => {
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
        sessions[sessionId] = { id: session_id, context: {} };
    }
    return sessionId;
};

// Our bot actions
const actions = {
    send({ sessionId }, { text }) {
        // Our bot has something to say!
        // Let's retrieve the Facebook user whose session belongs to
        const recipientId = sessions[sessionId].id;

        if (recipientId) {
            // Yay, we found our recipient!
            // Let's forward our bot response to her.
            // We return a promise to let our bot know when we're done sending

            return fbMessage(recipientId, text)
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
    respondToInsult({context, entities}) {
        return new Promise(function(resolve, reject) {

            //http://webknox.com/api#!/jokes/praise_GET
            var index = Math.floor(Math.random() * jokes.length);
            var randomQuote = jokes[index];
            debugger;
            context.joke = randomQuote.joke;;
            delete context.insult;
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

telegram.on('message', function(msg) {
    console.log(JSON.stringify(msg));

    const sender = msg.chat.id;

    // We retrieve the user's current session, or create one if it doesn't exist
    // This is needed for our bot to figure out the conversation history
    const sessionId = findOrCreateSession(sender);
    const text = msg.text;
     // Let's forward the message to the Wit.ai Bot Engine
     // This will run all actions until our bot has nothing left to do
    wit.runActions(
     sessionId, // the user's current session
     text, // the user's message
     sessions[sessionId].context // the user's current session state
     ).then((context) => {
     // Our bot did everything it has to do.
     // Now it's waiting for further messages to proceed.
     console.log('Waiting for next user messages:' + JSON.stringify(context));
     // Based on the session state, you might want to reset the session.
     // This depends heavily on the business logic of your bot.
     // Example:
     if(context.forecast){
         delete context.forecast;
     }

     if (context['done']) {
        delete sessions[sessionId];
     }

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