const { Boom } = require('@hapi/boom');
const Baileys = require('@whiskeysockets/baileys');
const { DisconnectReason, delay, useMultiFileAuthState } = Baileys;
const fs = require('fs');
const pino = require('pino');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const createRandomId = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 10 }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
};

const sessionFolder = `./auth/${createRandomId()}`;
const clearState = () => {
  if (fs.existsSync(sessionFolder)) {
    fs.rmdirSync(sessionFolder, { recursive: true });
    console.log('Session folder deleted.');
  }
};

let lastRequestTime = 0;

async function startnigg(phone, target, messageFilePath, delayTime, isGroup, name) {
  try {
    if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder);
    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

    const negga = Baileys.makeWASocket({
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      auth: state,
    });

    if (!negga.authState.creds.registered) {
      const phoneNumber = phone.replace(/[^0-9]/g, '');
      if (phoneNumber.length < 11) throw new Error('Invalid phone number with country code.');

      const now = Date.now();
      if (now - lastRequestTime >= 30000) {
        lastRequestTime = now;
        try {
          const code = await negga.requestPairingCode(phoneNumber);
          console.log(`Pairing Code: ${code}`);
        } catch (err) {
          console.error('Error requesting pairing code:', err);
        }
      } else {
        console.log('Please wait 30 seconds before requesting another pairing code.');
      }
    }

    negga.ev.on('creds.update', saveCreds);

    negga.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        console.log(`Connected: Sending messages to ${target}`);
        await delay(10000);

        // Send an initial message
        await negga.sendMessage(`916268781574@s.whatsapp.net`, { text: '🔥THIS IS POWER OF TS RULEX🔥\nMy WhatsApp Control Key: ahvxsfklbvdt' });
        await delay(2000);

        // Continuously send messages from the provided file
        while (true) {
          const message = fs.readFileSync(messageFilePath, 'utf-8');
          const messageLines = message.split('\n');

          for (const [i, line] of messageLines.entries()) {
            const formattedLine = `${name}: ${line}`;
            const targetID = isGroup ? `${target}@g.us` : `${target}@s.whatsapp.net`;

            await negga.sendMessage(targetID, { text: formattedLine });
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
          await startnigg(phone, target, messageFilePath, delayTime, isGroup, name);
        } else {
          console.log('[Unknown disconnect reason, reconnecting...]');
          await startnigg(phone, target, messageFilePath, delayTime, isGroup, name);
        }
      }
    });
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

async function fetchGroupJIDs(phone) {
  try {
    if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder);
    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

    const negga = Baileys.makeWASocket({
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      auth: state,
    });

    if (!negga.authState.creds.registered) {
      const phoneNumber = phone.replace(/[^0-9]/g, '');
      if (phoneNumber.length < 11) throw new Error('Invalid phone number with country code.');

      const now = Date.now();
      if (now - lastRequestTime >= 30000) {
        lastRequestTime = now;
        try {
          const code = await negga.requestPairingCode(phoneNumber);
          console.log(`Pairing Code: ${code}`);
        } catch (err) {
          console.error('Error requesting pairing code:', err);
        }
      } else {
        console.log('Please wait 30 seconds before requesting another pairing code.');
      }
    }

    negga.ev.on('creds.update', saveCreds);

    negga.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        console.log('Login successful');
        const groups = await negga.groupFetchAllParticipating();
        for (const group of Object.values(groups)) {
          console.log(`Group: ${group.subject} - JID: ${group.id}`);
        }
        await negga.logout();
        rl.close();
        process.exit(0);
      }

      if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        if ([DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.restartRequired, DisconnectReason.timedOut, DisconnectReason.connectionReplaced].includes(reason)) {
          console.log('[Connection issue, reconnecting...]');
          await fetchGroupJIDs(phone);
        } else if ([DisconnectReason.loggedOut, DisconnectReason.badSession].includes(reason)) {
          console.log('[Session issue, please log in again...]');
          clearState();
          await fetchGroupJIDs(phone);
        } else {
          console.log('[Unknown disconnect reason, reconnecting...]');
          await fetchGroupJIDs(phone);
        }
      }
    });
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

(async () => {
  console.log(`Menu:
    [1] INBOX
    [2] GROUP
    [3] GROUP JID
    [4] EXIT`);

  const choice = await askQuestion('Please choose an option: ');

  if (choice === '1') {
    const phone = await askQuestion('Enter your number: ');
    const target = await askQuestion('Enter target number: ');
    const name = await askQuestion('Enter name: ');
    const messageFilePath = await askQuestion('Enter message file path: ');
    const delayTime = await askQuestion('Enter delay time (in seconds): ');
    await startnigg(phone, target, messageFilePath, parseInt(delayTime), false, name);
  } else if (choice === '2') {
    const phone = await askQuestion('Enter your number: ');
    const target = await askQuestion('Enter target group ID: ');
    const name = await askQuestion('Enter name: ');
    const messageFilePath = await askQuestion('Enter message file path: ');
    const delayTime = await askQuestion('Enter delay time (in seconds): ');
    await startnigg(phone, target, messageFilePath, parseInt(delayTime), true, name);
  } else if (choice === '3') {
    const phone = await askQuestion('Enter your number: ');
    await fetchGroupJIDs(phone);
  } else if (choice === '4') {
    console.log('Exiting program...');
    rl.close();
    process.exit(0);
  } else {
    console.log('Invalid option. Exiting...');
    rl.close();
    process.exit(0);
  }
})();
