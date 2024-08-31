const { Boom } = require('@hapi/boom');
const Baileys = require('@whiskeysockets/baileys');
const { DisconnectReason, useMultiFileAuthState } = Baileys;
const fs = require('fs');
const pino = require('pino');

const sessionFolder = './auth/session';

const clearState = () => {
  if (fs.existsSync(sessionFolder)) {
    fs.rmdirSync(sessionFolder, { recursive: true });
    console.log('Session folder deleted.');
  }
};

const login = async (phone) => {
  if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder);
  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

  const negga = Baileys.makeWASocket({
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    auth: state,
  });

  negga.ev.on('creds.update', saveCreds);

  negga.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      console.log('Login successful');
      process.env.SESSION_ID = new Date().getTime(); // Set SESSION_ID for this session
    } else if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      if ([DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.restartRequired, DisconnectReason.timedOut, DisconnectReason.connectionReplaced].includes(reason)) {
        console.log('[Connection issue, reconnecting...]');
        await login(phone);
      } else if ([DisconnectReason.loggedOut, DisconnectReason.badSession].includes(reason)) {
        console.log('[Session issue, please log in again...]');
        clearState();
        await login(phone);
      } else {
        console.log('[Unknown disconnect reason, reconnecting...]');
        await login(phone);
      }
    }
  });

  const phoneNumber = phone.replace(/[^0-9]/g, '');
  if (phoneNumber.length < 11) throw new Error('Invalid phone number with country code.');

  const code = await negga.requestPairingCode(phoneNumber);
  console.log(`Pairing Code: ${code}`);
};

module.exports = { login };
