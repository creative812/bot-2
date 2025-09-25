/**
 * events/interactionCreate.js  
 * Full-featured interaction handler for Discord bot.
 *
 * Features:
 * - Handles Slash Commands with permission and cooldown management
 * - Handles Button interactions with handler dispatch
 * - Handles Select Menu interactions with handler dispatch
 * - Handles Modal submissions (if any)
 * - Handles Autocomplete for commands
 * - Logs interactions and errors robustly
 * - Proper deferred replies and error fallback messaging
 * - Supports user global cooldowns by command
 */

const { 
  PermissionsBitField,
  EmbedBuilder,
  InteractionType 
} = require('discord.js');

// Sample in-memory cooldown tracker { userId: { commandName: lastUsedTimestamp } }
const commandCooldowns = new Map();
const COOLDOWN_TIME = 2000; // 2 seconds default cooldown

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      // Slash Command Handling
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          return interaction.reply({ content: 'Unknown command.', ephemeral: true });
        }

        // Permission checks
        if (command.permissions) {
          if (command.permissions === 'admin' && !client.permissions.isAdmin(interaction.member)) {
            return interaction.reply({ content: 'Admin permissions required.', ephemeral: true });
          }
          if (command.permissions === 'moderator' && !client.permissions.isModerator(interaction.member)) {
            return interaction.reply({ content: 'Moderator permissions required.', ephemeral: true });
          }
        }

        // Cooldown check
        let userCd = commandCooldowns.get(interaction.user.id);
        if (!userCd) {
          userCd = {};
          commandCooldowns.set(interaction.user.id, userCd);
        }
        const now = Date.now();
        if (userCd[command.name] && now - userCd[command.name] < COOLDOWN_TIME) {
          return interaction.reply({ content: `Please wait before using \`${command.name}\` again.`, ephemeral: true });
        }
        userCd[command.name] = now;

        // Execute command and handle errors
        try {
          await command.execute(interaction, client);
        } catch (error) {
          client.logger.error(`Command execution error: ${command.name}`, error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
          } else {
            await interaction.editReply({ content: 'There was an error executing this command.' });
          }
        }
        return;
      }

      // Button Interaction
      if (interaction.isButton()) {
        const handler = client.buttonHandlers.get(interaction.customId);
        if (!handler) {
          return interaction.reply({ content: 'Unknown button interaction.', ephemeral: true });
        }
        try {
          await handler(interaction, client);
        } catch (error) {
          client.logger.error(`Button handler error: ${interaction.customId}`, error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Error handling button interaction.', ephemeral: true });
          } else {
            await interaction.editReply({ content: 'Error handling button interaction.' });
          }
        }
        return;
      }

      // Select Menu Interaction
      if (interaction.isStringSelectMenu()) {
        const handler = client.selectMenuHandlers.get(interaction.customId);
        if (!handler) {
          return interaction.reply({ content: 'Unknown select menu interaction.', ephemeral: true });
        }
        try {
          await handler(interaction, client);
        } catch (error) {
          client.logger.error(`Select menu handler error: ${interaction.customId}`, error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Error handling select menu interaction.', ephemeral: true });
          } else {
            await interaction.editReply({ content: 'Error handling select menu interaction.' });
          }
        }
        return;
      }

      // Modal Submit Interaction (if implemented)
      if (interaction.type === InteractionType.ModalSubmit) {
        const handler = client.modalHandlers.get(interaction.customId);
        if (!handler) {
          return interaction.reply({ content: 'Unknown modal submission.', ephemeral: true });
        }
        try {
          await handler(interaction, client);
        } catch (error) {
          client.logger.error(`Modal handler error: ${interaction.customId}`, error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Error handling modal submission.', ephemeral: true });
          } else {
            await interaction.editReply({ content: 'Error handling modal submission.' });
          }
        }
        return;
      }

      // Autocomplete Interaction
      if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || typeof command.autocomplete !== 'function') {
          return interaction.respond([]);
        }
        try {
          await command.autocomplete(interaction, client);
        } catch (error) {
          client.logger.error(`Autocomplete error: ${interaction.commandName}`, error);
          await interaction.respond([]);
        }
        return;
      }

      // Other interaction types or unhandled
    } catch (error) {
      client.logger.error('General interactionCreate handler error:', error);
      if (interaction && !interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({ content: 'An unexpected error occurred.', ephemeral: true });
        } catch {} // Ignore errors during reply
      }
    }
  }
};
