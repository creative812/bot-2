const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

/**
 * Info Command - Displays bot and server information
 * 
 * Features:
 * - Bot uptime, version, ping
 * - Server stats (member count, channel count, boost level)
 * - Invite link and support info
 * - Configurable embed color from server settings
 */

const commands = [
  {
    name: 'info',
    description: 'Display bot and server information',
    permissions: 'user',
    data: new SlashCommandBuilder()
      .setName('info')
      .setDescription('Display bot and server information')
      .addBooleanOption(opt =>
        opt.setName('bot')
           .setDescription('Show bot info instead of server info')
           .setRequired(false))
      .addBooleanOption(opt =>
        opt.setName('invite')
           .setDescription('Include invite/support links')
           .setRequired(false)),
    async execute(interaction, client) {
      const showBot = interaction.options.getBoolean('bot') || false;
      const showInvite = interaction.options.getBoolean('invite') || false;

      // Defer reply ephemerally for user context
      await interaction.deferReply({ ephemeral: true });

      // Get embed color from settings
      const settings = await client.db.getGuildSettings(interaction.guild.id);
      const color = settings.embedcolor ? `#${settings.embedcolor}` : '#7289DA';

      if (showBot) {
        // Bot stats
        const uptime = client.uptime;
        const days = Math.floor(uptime / 86400000);
        const hours = Math.floor((uptime % 86400000) / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        const seconds = Math.floor((uptime % 60000) / 1000);

        const embed = new EmbedBuilder()
          .setTitle('🤖 Bot Information')
          .setColor(color)
          .addFields(
            { name: 'Uptime', value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: true },
            { name: 'Ping',   value: `${client.ws.ping}ms`, inline: true },
            { name: 'Servers',value: `${client.guilds.cache.size}`, inline: true },
            { name: 'Users',  value: `${client.users.cache.size}`, inline: true },
            { name: 'Commands',value: `${client.commands.size}`, inline: true }
          )
          .setFooter({ text: `Version: ${client.config.version}` });

        if (showInvite) {
          embed.addFields(
            { name: 'Invite', value: `[Click here](${client.config.inviteURL})`, inline: true },
            { name: 'Support', value: `[Join Support](${client.config.supportURL})`, inline: true }
          );
        }

        return interaction.editReply({ embeds: [embed] });
      } else {
        // Server stats
        const { guild } = interaction;
        const boostLevel = guild.premiumTier ? `Tier ${guild.premiumTier}` : 'None';

        const embed = new EmbedBuilder()
          .setTitle('📊 Server Information')
          .setColor(color)
          .setThumbnail(guild.iconURL())
          .addFields(
            { name: 'Server Name', value: guild.name, inline: true },
            { name: 'Server ID',   value: guild.id, inline: true },
            { name: 'Owner',       value: `<@${guild.ownerId}>`, inline: true },
            { name: 'Members',     value: `${guild.memberCount}`, inline: true },
            { name: 'Channels',    value: `${guild.channels.cache.size}`, inline: true },
            { name: 'Roles',       value: `${guild.roles.cache.size}`, inline: true },
            { name: 'Boost Level', value: boostLevel, inline: true }
          )
          .setTimestamp();

        if (showInvite) {
          embed.addFields(
            { name: 'Invite', value: `[Invite Bot](${client.config.inviteURL})`, inline: true },
            { name: 'Support', value: `[Support Server](${client.config.supportURL})`, inline: true }
          );
        }

        return interaction.editReply({ embeds: [embed] });
      }
    }
  }
];

module.exports = { commands };
