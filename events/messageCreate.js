/**
 * events/messageCreate.js
 * Handles new messages for prefix commands, message logging, and basic moderation triggers
 */

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    try {
      // Ignore bots and DMs
      if (message.author.bot || !message.guild) return;

      const guildId = message.guild.id;
      const content = message.content;

      // Fetch prefix and settings from DB/cache
      const settings = await client.db.getGuildSettings(guildId);
      if (!settings) return;

      const prefix = settings.prefix || '!';

      // Basic log: optionally log messages to a designated channel

      if (settings.loggingchannelid) {
        const logChan = message.guild.channels.cache.get(settings.loggingchannelid);
        if (logChan?.isTextBased() && logChan.viewable) {
          logChan.send({
            content: `[${message.author.tag}]: ${content}`,
            allowedMentions: { users: [], roles: [] }
          }).catch(() => {});
        }
      }

      // Handle prefix commands (legacy support)
      if (content.startsWith(prefix)) {
        // Extract command name and args
        const args = content.slice(prefix.length).trim().split(/\s+/);
        const cmdName = args.shift().toLowerCase();

        const command = client.commands.get(cmdName);
        if (!command) return;

        // Permission checks
        if (command.permissions === 'admin' && !client.permissions.isAdmin(message.member)) return;
        if (command.permissions === 'moderator' && !client.permissions.isModerator(message.member)) return;

        // Execute command — mimic command interaction structure
        try {
          await command.execute({
            user: message.author,
            member: message.member,
            guild: message.guild,
            channel: message.channel,
            args,
            reply: (opts) => message.channel.send(opts),
            // Add minimal interaction properties as needed
          }, client);
        } catch (err) {
          client.logger.error(`Prefix command error: ${cmdName}`, err);
          message.channel.send('Error executing the command.');
        }
      }

      // Optional: Add keyword or filter-based automod logic here

    } catch (err) {
      client.logger.error('messageCreate event error:', err);
    }
  }
};
