/**
 * events/guildMemberAdd.js - refined version with mention neutralization
 */

const { TextChannel, NewsChannel } = require('discord.js');
const { sanitizeString } = require('../utility.js'); // Your utility module

/**
 * Neutralize mass mentions like @everyone and @here to prevent unwanted pings
 */
function neutralizeMentions(text) {
  return text
    .replace(/@everyone/gi, '@\u200beveryone')
    .replace(/@here/gi, '@\u200bhere');
}

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const guild = member.guild;
    const userId = member.user.id;
    const guildId = guild.id;

    const settings = await client.db.getGuildSettings(guildId);
    if (!settings) return;

    if (settings.autoroleid) {
      const role = guild.roles.cache.get(settings.autoroleid);
      if (role) {
        try {
          await member.roles.add(role, 'Auto-role on member join');
        } catch (err) {
          client.logger.warn(`[Auto-Role] Failed to assign ${role.name} for user ${userId}: ${err.message}`);
        }
      }
    }

    if (settings.welcomechannelid && settings.welcomemessage) {
      const channel = guild.channels.cache.get(settings.welcomechannelid);
      if (channel && (channel instanceof TextChannel || channel instanceof NewsChannel)) {
        try {
          let msg = settings.welcomemessage;
          msg = neutralizeMentions(msg);
          msg = msg.replace('{user}', `<@${userId}>`);
          msg = msg.replace('{server}', sanitizeString(guild.name));

          await channel.send({ content: msg });
        } catch (err) {
          client.logger.warn(`[Welcome] Failed to send welcome message in guild ${guildId}: ${err.message}`);
        }
      }
    }
  }
};