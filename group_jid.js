const { Boom } = require('@hapi/boom');
const Baileys = require('@whiskeysockets/baileys');
const { DisconnectReason, useMultiFileAuthState } = Baileys;
const fs = require('fs');
const pino = require('pino');

const sessionFolder = './auth/session';

const fetchGroupJIDs = async () => {
  try {
    if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder);
    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

    const negga = Baileys.makeWASocket({
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      auth: state,
    });

    negga.ev.on('creds.update', saveCreds);

    negga.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        console.log('Connected: Fetching group JIDs...');
        const chats = await negga.chats.all();
        const groupChats = chats.filter(chat => chat.isGroup);

        console.log('Group JIDs:');
        groupChats.forEach(group => console.log(group.id));
        
        process.exit(0);
      }

      if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        const reconnectActions = {
          [DisconnectReason.connectionClosed]: '[Connection closed, reconnecting...]',
          [DisconnectReason.connectionLost]: '[Connection lost, reconnecting...]',
          [DisconnectReason.loggedOut]: '[Logged out, please log in again...]',
          [DisconnectReason.restartRequired]: '[Server restart required, reconnecting...]',
          [DisconnectReason.timedOut]: '[Connection timed out, reconnecting...]',
          [DisconnectReason.badSession]: '[Bad session, reconnecting...]',
          [DisconnectReason.connectionReplaced]: '[Connection replaced, reconnecting...]',
        };

        if (reconnectActions[reason]) {
          console.log(reconnectActions[reason]);
          if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) clearState();
          await fetchGroupJIDs();
        } else {
          console.log('[Unknown disconnect reason, reconnecting...]');
          await fetchGroupJIDs();
        }
      }
    });
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

module.exports = { fetchGroupJIDs };
