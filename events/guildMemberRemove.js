/**
 * events/guildMemberRemove.js
 * Handles member leaving, optionally logs leave message
 */

const { TextChannel, NewsChannel } = require('discord.js');
const { sanitizeString } = require('../utility.js'); // Optional utility for safe strings

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    try {
      const guild = member.guild;
      const guildId = guild.id;

      // Fetch guild settings for leave messages
      const settings = await client.db.getGuildSettings(guildId);
      if (!settings) return;

      if (settings.leavechannelid && settings.leavemessage) {
        const channel = guild.channels.cache.get(settings.leavechannelid);
        if (channel && (channel instanceof TextChannel || channel instanceof NewsChannel)) {
          try {
            let msg = settings.leavemessage;
            msg = msg.replace('{user}', `${member.user.tag}`);
            msg = msg.replace('{server}', sanitizeString(guild.name));

            // Neutralize mentions like @everyone and @here for safety
            msg = msg.replace(/@everyone/gi, '@\u200beveryone');
            msg = msg.replace(/@here/gi, '@\u200bhere');

            await channel.send({ content: msg });
          } catch (err) {
            client.logger.warn(`[Leave] Failed to send leave message in guild ${guildId}: ${err.message}`);
          }
        }
      }
    } catch (err) {
      client.logger.error('guildMemberRemove event error:', err);
    }
  }
};
