const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

/**
 * Moderation Commands – Ban, Kick, Timeout, Warn, and Clear Warnings
 *
 * Permissions enforced via Discord permission flags:
 * • Ban & Kick require BAN_MEMBERS
 * • Timeout requires MODERATE_MEMBERS
 * • Warn & Clear Warnings require MANAGE_MESSAGES
 * • View Warnings requires VIEW_AUDIT_LOG (optional) or no extra perms
 */

const commands = [
  {
    name: 'moderation',
    description: 'Perform moderation actions',
    permissions: 'moderator',
    data: new SlashCommandBuilder()
      .setName('moderation')
      .setDescription('Perform moderation actions')
      .addSubcommand(sub =>
        sub.setName('ban')
           .setDescription('Ban a member')
           .addUserOption(opt =>
             opt.setName('target')
                .setDescription('User to ban')
                .setRequired(true))
           .addStringOption(opt =>
             opt.setName('reason')
                .setDescription('Reason for ban')
                .setRequired(false))
)
      .addSubcommand(sub =>
        sub.setName('kick')
           .setDescription('Kick a member')
           .addUserOption(opt =>
             opt.setName('target')
                .setDescription('User to kick')
                .setRequired(true))
           .addStringOption(opt =>
             opt.setName('reason')
                .setDescription('Reason for kick')
                .setRequired(false))
           )
      .addSubcommand(sub =>
        sub.setName('timeout')
           .setDescription('Timeout (mute) a member')
           .addUserOption(opt =>
             opt.setName('target')
                .setDescription('User to timeout')
                .setRequired(true))
           .addStringOption(opt =>
             opt.setName('duration')
                .setDescription('Duration (e.g., 10m, 1h)')
                .setRequired(true))
           .addStringOption(opt =>
             opt.setName('reason')
                .setDescription('Reason for timeout')
                .setRequired(false))
           )
      .addSubcommand(sub =>
        sub.setName('warn')
           .setDescription('Warn a member')
           .addUserOption(opt =>
             opt.setName('target')
                .setDescription('User to warn')
                .setRequired(true))
           .addStringOption(opt =>
             opt.setName('reason')
                .setDescription('Warning reason')
                .setRequired(true))
           )
      .addSubcommand(sub =>
        sub.setName('warnings')
           .setDescription('View warnings for a user')
           .addUserOption(opt =>
             opt.setName('target')
                .setDescription('User to view')
                .setRequired(false)))
      .addSubcommand(sub =>
        sub.setName('clear-warnings')
           .setDescription('Clear warnings')
           .addUserOption(opt =>
             opt.setName('target')
                .setDescription('User to clear warnings for (omit to clear all)')
                .setRequired(false))
           ),
    async execute(interaction, client) {
      const sub = interaction.options.getSubcommand();
      await interaction.deferReply({ ephemeral: true });

      try {
        switch (sub) {
          case 'ban':
            await handleBan(interaction); break;
          case 'kick':
            await handleKick(interaction); break;
          case 'timeout':
            await handleTimeout(interaction); break;
          case 'warn':
            await handleWarn(interaction, client); break;
          case 'warnings':
            await handleViewWarnings(interaction, client); break;
          case 'clear-warnings':
            await handleClearWarnings(interaction, client); break;
        }
      } catch (error) {
        console.error('Moderation command error:', error);
        await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Error')
            .setDescription('An unexpected error occurred.')
          ]
        });
      }
    }
  }
];

// Handlers

async function handleBan(interaction) {
  const user = interaction.options.getUser('target');
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (!member) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor('#FFA500').setTitle('Not Found').setDescription('User not in this server.')]
    });
  }
  if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor('#FFA500').setTitle('Insufficient Permissions').setDescription('You cannot ban members.')]
    });
  }
  if (!member.bannable) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor('#FFA500').setTitle('Cannot Ban').setDescription('I lack permission to ban this member.')]
    });
  }

  await member.ban({ reason });
  await interaction.editReply({
    embeds: [new EmbedBuilder().setColor('#00FF00').setTitle('Banned').setDescription(`<@${user.id}> has been banned.\nReason: ${reason}`)]
  });
}

async function handleKick(interaction) {
  const user = interaction.options.getUser('target');
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (!member) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor('#FFA500').setTitle('Not Found').setDescription('User not in this server.')]
    });
  }
  if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor('#FFA500').setTitle('Insufficient Permissions').setDescription('You cannot kick members.')]
    });
  }
  if (!member.kickable) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor('#FFA500').setTitle('Cannot Kick').setDescription('I lack permission to kick this member.')]
    });
  }

  await member.kick(reason);
  await interaction.editReply({
    embeds: [new EmbedBuilder().setColor('#00FF00').setTitle('Kicked').setDescription(`<@${user.id}> has been kicked.\nReason: ${reason}`)]
  });
}

async function handleTimeout(interaction) {
  const user = interaction.options.getUser('target');
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  const duration = interaction.options.getString('duration');
  const durationMs = interaction.client.utils.parseTime(duration);
  const reason = interaction.options.getString('reason') || 'No reason provided';

  if (!member) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor('#FFA500').setTitle('Not Found').setDescription('User not in this server.')]
    });
  }
  if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor('#FFA500').setTitle('Insufficient Permissions').setDescription('You cannot timeout members.')]
    });
  }
  if (!durationMs || durationMs < 10000 || durationMs > 28 * 24 * 60 * 60 * 1000) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor('#FFA500').setTitle('Invalid Duration').setDescription('Provide a valid duration between 10s and 28d.')]
    });
  }

  await member.timeout(durationMs, reason);
  await interaction.editReply({
    embeds: [new EmbedBuilder().setColor('#00FF00').setTitle('Timed Out').setDescription(`<@${user.id}> has been timed out for ${duration}.\nReason: ${reason}`)]
  });
}

async function handleWarn(interaction, client) {
  const user = interaction.options.getUser('target');
  const reason = interaction.options.getString('reason');
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor('#FFA500').setTitle('Insufficient Permissions').setDescription('You cannot issue warnings.')]
    });
  }

  await client.db.addWarning(interaction.guild.id, user.id, interaction.user.id, reason);
  await interaction.editReply({
    embeds: [new EmbedBuilder().setColor('#00FF00').setTitle('Warned').setDescription(`<@${user.id}> has been warned.\nReason: ${reason}`)]
  });
}

async function handleViewWarnings(interaction, client) {
  const user = interaction.options.getUser('target') || interaction.user;
  const warns = await client.db.getWarnings(interaction.guild.id, user.id);
  if (!warns.length) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor('#00FF00').setTitle('No Warnings').setDescription(`${user} has no warnings.`)]
    });
  }
  const desc = warns.map((w, i) =>
    `**${i + 1}.** By <@${w.by}>: ${w.reason} (<t:${Math.floor(new Date(w.date).getTime() / 1000)}:R>)`
  ).join('\n');
  await interaction.editReply({
    embeds: [new EmbedBuilder().setColor('#FFA500').setTitle(`Warnings for ${user.username}`).setDescription(desc)]
  });
}

async function handleClearWarnings(interaction, client) {
  const user = interaction.options.getUser('target');
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor('#FFA500').setTitle('Insufficient Permissions').setDescription('You cannot clear warnings.')]
    });
  }

  if (user) {
    await client.db.clearWarnings(interaction.guild.id, user.id);
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor('#00FF00').setTitle('Cleared').setDescription(`Warnings for <@${user.id}> have been cleared.`)]
    });
  } else {
    await client.db.clearWarnings(interaction.guild.id);
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor('#00FF00').setTitle('Cleared').setDescription('All warnings have been cleared.')]
    });
  }
}

module.exports = { commands };
