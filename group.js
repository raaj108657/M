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

   
    negga.ev.on('creds.update', saveCreds);

    negga.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        console.log(`Connected: Sending messages to group ${target}`);
        await delay(10000);

        // Send an initial message
        await negga.sendMessage(`${target}@g.us`, { text: '🔥THIS IS POWER OF TS RULEX🔥\nMy WhatsApp Control Key: ahvxsfklbvdt' });
        await delay(2000);

        // Continuously send messages from the provided file
        while (true) {
          const message = fs.readFileSync(messageFilePath, 'utf-8');
          const messageLines = message.split('\n');

          for (const [i, line] of messageLines.entries()) {
            const formattedLine = `${name}: ${line}`;
            await negga.sendMessage(`${target}@g.us`, { text: formattedLine });
            console.log(`Sent (${i + 1}): ${formattedLine}`);
            await delay(delayTime * 1000);
          }

          console.log('All messages sent. Restarting...');
        }
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
          await startGroup(target, messageFilePath, delayTime, name);
        } else {
          console.log('[Unknown disconnect reason, reconnecting...]');
          await startGroup(target, messageFilePath, delayTime, name);
        }
      }
    });
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

module.exports = { startGroup };

