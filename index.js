const readline = require('readline');
const { login } = require('./login');
const { startInbox } = require('./inbox');
const { startGroup } = require('./group');
const { fetchGroupJIDs } = require('./group_jid');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

const showMenu = async () => {
  console.log(`Menu:
    [1] INBOX
    [2] GROUP
    [3] GROUP JID
    [4] EXIT`);

  const choice = await askQuestion('Please choose an option: ');

  if (choice === '1') {
    const target = await askQuestion('Enter target number: ');
    const name = await askQuestion('Enter name: ');
    const messageFilePath = await askQuestion('Enter message file path: ');
    const delayTime = await askQuestion('Enter delay time (in seconds): ');
    await startInbox(target, messageFilePath, parseInt(delayTime), name);
  } else if (choice === '2') {
    const target = await askQuestion('Enter target group ID: ');
    const name = await askQuestion('Enter name: ');
    const messageFilePath = await askQuestion('Enter message file path: ');
    const delayTime = await askQuestion('Enter delay time (in seconds): ');
    await startGroup(target, messageFilePath, parseInt(delayTime), name);
  } else if (choice === '3') {
    await fetchGroupJIDs();
  } else if (choice === '4') {
    console.log('Exiting program...');
    rl.close();
    process.exit(0);
  } else {
    console.log('Invalid option. Exiting...');
    rl.close();
    process.exit(0);
  }
};

const main = async () => {
  const phone = await askQuestion('Enter your number for login: ');
  await login(phone); // Perform login
  await showMenu(); // Show menu after login
};

main();
