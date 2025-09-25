const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

/**
 * Levels Command - XP & Leveling System
 *
 * Features:
 * - Display user rank & leaderboard
 * - Customize level-up messages
 * - Reset XP & levels
 */

const commands = [
  {
    name: 'levels',
    description: 'View and manage the leveling system',
    permissions: 'user',
    data: new SlashCommandBuilder()
      .setName('levels')
      .setDescription('View and manage the leveling system')
      .addSubcommand(sub =>
        sub.setName('rank')
           .setDescription('View your or another user’s rank')
           .addUserOption(opt =>
             opt.setName('user')
                .setDescription('The user to view')
                .setRequired(false)))
      .addSubcommand(sub =>
        sub.setName('leaderboard')
           .setDescription('View the top users on the server'))
      .addSubcommand(sub =>
        sub.setName('reset')
           .setDescription('Reset XP and levels for a user')
           .addUserOption(opt =>
             opt.setName('user')
                .setDescription('The user to reset')
                .setRequired(true))),

    async execute(interaction, client) {
      const sub = interaction.options.getSubcommand();
      await interaction.deferReply({ ephemeral: sub === 'reset' });

      try {
        switch (sub) {
          case 'rank':
            await handleRank(interaction, client);
            break;
          case 'leaderboard':
            await handleLeaderboard(interaction, client);
            break;
          case 'reset':
            await handleResetXP(interaction, client);
            break;
        }
      } catch (error) {
        client.logger.error('Levels command error:', error);
        const errEmbed = client.embeds.createError('Error', 'An error occurred.');
        if (interaction.deferred) {
          await interaction.editReply({ embeds: [errEmbed] });
        } else {
          await interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }
      }
    }
  }
];

// Handlers

async function handleRank(interaction, client) {
  const user = interaction.options.getUser('user') || interaction.user;
  const record = await client.db.getUserLevel(interaction.guild.id, user.id);
  if (!record) {
    return interaction.editReply({
      embeds: [client.embeds.createInfo('No Data', `${user} has no XP records yet.`)]
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(`📊 Level & XP for ${user.username}`)
    .setColor('#FFD700')
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: 'Level', value: `${record.level}`, inline: true },
      { name: 'XP',    value: `${record.xp}/${client.utils.nextLevelXP(record.level)}`, inline: true },
      { name: 'Rank',  value: `#${record.rank}`, inline: true }
    );

  await interaction.editReply({ embeds: [embed] });
}

async function handleLeaderboard(interaction, client) {
  const top = await client.db.getLeaderboard(interaction.guild.id, 10);
  if (!top.length) {
    return interaction.editReply({
      embeds: [client.embeds.createInfo('Empty Leaderboard', 'No XP data yet.')]
    });
  }

  const description = top
    .map((r, i) => `**${i+1}.** <@${r.userid}> — Level ${r.level} (${r.xp} XP)`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🏆 Server Leaderboard')
    .setColor('#FFD700')
    .setDescription(description)
    .setFooter({ text: `Showing top ${top.length}` });

  await interaction.editReply({ embeds: [embed] });
}

async function handleResetXP(interaction, client) {
  const user = interaction.options.getUser('user');
  await client.db.resetUserLevel(interaction.guild.id, user.id);
  await interaction.editReply({
    embeds: [client.embeds.createSuccess('✅ Reset Complete', `XP and level for ${user} have been reset.`)]
  });
}

module.exports = { commands };
