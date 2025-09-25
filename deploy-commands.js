require('dotenv').config({ override: true });
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const token = process.env.DISCORD_TOKEN || config.token;
const clientId = process.env.CLIENT_ID || config.clientId;

console.log('I Debug Info:');
console.log('Token configured:', !!token);
console.log('ClientId:', clientId);
console.log('Process args:', process.argv);

if (!token) {
  console.error('I No Discord token provided! Please set DISCORD_TOKEN environment variable or add it to config.json');
  process.exit(1);
}

if (!clientId) {
  console.error('I No client ID provided! Please set CLIENT_ID environment variable or add it to config.json');
  process.exit(1);
}

const commands = [];
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const commandModule = require(`./commands/${file}`);

  // Handle array of commands export (legacy or AI style)
  if (commandModule.commands && Array.isArray(commandModule.commands)) {
    commandModule.commands.forEach(cmd => {
      if (cmd.data) {
        commands.push(cmd.data.toJSON());
        console.log(`I Loaded command: ${cmd.data.name}`);
      }
    });
  }
  else if (commandModule.data && Array.isArray(commandModule.data)) {
    commandModule.data.forEach(cmd => {
      commands.push(cmd.toJSON());
      console.log(`I Loaded AI command: ${cmd.name}`);
    });
  }
  // Single command data export
  else if (commandModule.data) {
    commands.push(commandModule.data.toJSON());
    console.log(`I Loaded single command: ${commandModule.data.name}`);
  }
  else {
    console.log(`II Skipping ${file} - no valid command structure found`);
  }
}

const rest = new REST({ version: '10' }).setToken(token);

async function testToken() {
  try {
    console.log('\nI Testing token validity...');
    const application = await rest.get('/applications/@me');
    console.log(`I Token is valid! Application: ${application.name} (${application.id})`);
    return true;
  } catch (error) {
    console.error('I Token test failed:', error.message);
    if (error.status === 401) {
      console.error('I Your bot token is invalid. Please:');
      console.error('   1. Go to Discord Developer Portal');
      console.error('   2. Go to your bot application → Bot tab');
      console.error('   3. Click "Reset Token" and get a new one');
      console.error('   4. Update your .env file or config.json');
    }
    return false;
  }
}

(async () => {
  const tokenValid = await testToken();
  if (!tokenValid) process.exit(1);

  try {
    console.log(`\nI Started refreshing ${commands.length} application (/) commands.`);

    // Determine deployment mode and target
    const args = process.argv.slice(2);

    if (args.length === 0) {
      // Global deployment (may take up to one hour to sync)
      console.log('I Deploying globally (this may take up to 1 hour to sync)');
      const data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
      console.log(`I Successfully deployed ${data.length} application (/) commands globally.`);
    }
    else if (args[0] === 'all') {
      // Deploy to all guilds listed in config.guildId (comma separated)
      const guildIds = (config.guildId || '').split(',').map(id => id.trim()).filter(Boolean);
      console.log(`I Deploying to ${guildIds.length} servers...`);
      for (const guildId of guildIds) {
        try {
          console.log(`\nI Deploying to guild: ${guildId}`);
          const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
          );
          console.log(`I Successfully deployed ${data.length} commands to guild ${guildId}`);
        } catch (error) {
          console.error(`I Failed to deploy to guild ${guildId}:`, error.message);
          if (error.status === 403) {
            console.error('I Bot is not in this server or lacks permissions');
          }
        }
      }
    }
    else {
      // Deploy to specific guild passed as argument
      const guildId = args[0];
      console.log(`I Deploying to guild: ${guildId}`);
      const data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );
      console.log(`I Successfully deployed ${data.length} application (/) commands for guild ${guildId}`);
    }

    console.log('\nI Deployed Commands:');
    commands.forEach((cmd, idx) => {
      console.log(`${idx + 1}. /${cmd.name} - ${cmd.description}`);
    });

    console.log('\nI Command deployment completed successfully!');
    console.log('\nI Usage:');
    console.log('   node deploy-commands.js                 (deploy globally)');
    console.log('   node deploy-commands.js <guild_id>      (deploy to specific guild)');
    console.log('   node deploy-commands.js all             (deploy to all configured guilds)');
  } catch (error) {
    console.error('I Error deploying commands:', error);
    if (error.status === 401) {
      console.error('I Unauthorized - Token invalid or expired');
      console.error('   → Reset your bot token in Discord Developer Portal');
    } else if (error.status === 403) {
      console.error('I Forbidden - Bot lacks permissions or is not in the server');
      console.error('   → Make sure bot is in the server with applications.commands scope');
    } else if (error.status === 404) {
      console.error('I Not Found - Check your Client ID or Guild ID');
    } else if (error.code === 50001) {
      console.error('I Missing Access - Make sure the bot is invited to the server with the applications.commands scope');
    } else if (error.code === 10001) {
      console.error('I Unknown Application - Check that your CLIENT_ID is correct');
    } else if (error.code === 50035) {
      console.error('I Invalid Form Body - Check your command structure');
    }
    process.exit(1);
  }
})();
