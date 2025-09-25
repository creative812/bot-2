require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config.json');
const logger = require('./utils/logger');
const PermissionManager = require('./utils/permission');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();
client.buttonHandlers = new Collection();
client.selectMenuHandlers = new Collection();
client.modalHandlers = new Collection();
client.logger = logger;
client.permissions = PermissionManager;

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.name && command.execute) {
    client.commands.set(command.name, command);
    logger.info(`Loaded command: ${command.name}`);
  }
}

// Load event handlers - FIXED: preserve Discord.js argument order
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  logger.info(`Registered event: ${event.name}`);
}

// Connect to your database (example using an async init function)
(async () => {
  try {
    if (client.db && typeof client.db.connect === 'function') {
      await client.db.connect();
      logger.info('Database connected.');
    }
  } catch (error) {
    logger.error('Database connection error:', error);
  }
})();

// Scheduled Tasks
const scheduledTasks = require('./scheduled/tasks.js');

// Start the bot
client.login(process.env.DISCORD_TOKEN || config.token)
  .then(() => {
    logger.info('Bot logged in successfully.');

    // Start all scheduled tasks once ready event fired
    client.once('ready', () => {
      scheduledTasks.startAll(client);
    });
  })
  .catch(error => {
    logger.error('Failed to login:', error);
  });

module.exports = client;
