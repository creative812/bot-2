/**
 * events/ready.js
 * Rotates bot presence with dynamic activity messages
 * Logs the activity type as string instead of numeric enum value
 */

const { ActivityType } = require('discord.js');

// Mapping enum numeric values back to string keys
const activityTypeNames = Object.entries(ActivityType).reduce((acc, [key, val]) => {
  acc[val] = key;
  return acc;
}, {});

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    try {
      client.logger.info(`Bot started as ${client.user.tag} (ID: ${client.user.id})`);
      client.logger.info(`Connected to ${client.guilds.cache.size} guild(s)`);

      const activities = [
        { type: ActivityType.Playing,    text: () => `with ${client.guilds.cache.size} servers` },
        { type: ActivityType.Listening,  text: () => `/help for commands` },
        { type: ActivityType.Watching,   text: () => `${client.guilds.cache.size} communities` },
        { type: ActivityType.Competing,  text: () => `in coding challenges` }
      ];

      let index = 0;

      const updateStatus = async () => {
        const activity = activities[index];
        index = (index + 1) % activities.length;

        try {
          await client.user.setPresence({
            activities: [{ name: activity.text(), type: activity.type }],
            status: 'online'
          });
          const typeName = activityTypeNames[activity.type] || 'Unknown';
          client.logger.debug(`Presence updated: ${typeName} "${activity.text()}"`);
        } catch (error) {
          client.logger.warn('Failed to set presence:', error.message);
        }
      };

      await updateStatus();

      if (client.statusInterval) clearInterval(client.statusInterval);
      client.statusInterval = setInterval(updateStatus, 120000);

      client.logger.info('Bot is fully ready and rotating status.');
    } catch (error) {
      client.logger.error('Error in ready event:', error);
    }
  }
};
