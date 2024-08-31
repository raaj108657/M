const { Boom } = require('@hapi/boom');
const Baileys = require('@whiskeysockets/baileys');
const { DisconnectReason, delay, useMultiFileAuthState } = Baileys;
const fs = require('fs');
const pino = require('pino');

const sessionFolder = './auth/session';

const startGroup = async (target, messageFilePath, delayTime, name) => {
  try {
    if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder);
    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

    const negga = Baileys.makeWASocket({
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      auth: state,
    });

   
