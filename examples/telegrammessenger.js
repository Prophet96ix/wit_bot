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
            debugger;
            return fbMessage(recipientId, text)

        } else {
            console.error('Oops! Couldn\'t find user for session:', sessionId);
            // Giving the wheel back to our bot
            return Promise.resolve()
        }
    },
    // You should implement your custom actions here
    // See https://wit.ai/docs/quickstart
};

// Setting up our WIT bot
const wit = new Wit({
    accessToken: WIT_TOKEN,
    actions,
    logger: new log.Logger(log.INFO)
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
     console.log('Waiting for next user messages');
debugger;
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