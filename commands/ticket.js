const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require('discord.js');

/**
 * Ticket Commands – refined permissions and button IDs
 */

const TICKET_LOCK = new Set();
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

const commands = [
  {
    name: 'ticket',
    description: 'Manage support tickets',
    permissions: 'user',
    data: new SlashCommandBuilder()
      .setName('ticket')
      .setDescription('Manage support tickets')
      .addSubcommand(sub => sub.setName('setup').setDescription('Initialize ticket system'))
      .addSubcommand(sub => sub.setName('create').setDescription('Create a new support ticket'))
      .addSubcommand(sub => sub.setName('claim').setDescription('Claim a ticket'))
      .addSubcommand(sub => sub.setName('close').setDescription('Close a ticket')),
    async execute(interaction, client) {
      const sub = interaction.options.getSubcommand();
      await interaction.deferReply({ ephemeral: sub !== 'create' });

      try {
        switch (sub) {
          case 'setup': return await setupTicketSystem(interaction, client);
          case 'create': return await createTicket(interaction, client);
          case 'claim': return await claimTicket(interaction, client);
          case 'close': return await confirmClose(interaction, client);
          default:
            return interaction.editReply({
              embeds: [new EmbedBuilder().setColor('Red').setTitle('Invalid Subcommand').setDescription('Unknown ticket subcommand.')]
            });
        }
      } catch (err) {
        client.logger.error('Ticket command error:', err);
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('Red').setTitle('Error').setDescription('An error occurred.')]
        });
      }
    }
  }
];

// Use permissions from PermissionsBitField.Flags
const FLAGS = PermissionsBitField.Flags;

// Safe permission check
function hasPerms(member, perms) {
  if (!member || !member.permissions) return false;
  if (typeof perms === 'string') perms = [perms];
  try {
    return member.permissions.has(perms, true);
  } catch {
    return false;
  }
}

async function setupTicketSystem(interaction, client) {
  const embed = new EmbedBuilder()
    .setTitle('Ticket Setup')
    .setDescription('Configure ticket category, staff role, and log channel using buttons.')
    .setColor('#00A2E8');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_setup_category').setLabel('Set Category').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_setup_staff').setLabel('Set Staff Role').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_setup_log').setLabel('Set Log Channel').setStyle(ButtonStyle.Primary)
  );
  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function createTicket(interaction, client) {
  const userId = interaction.user.id;
  if (client.rateLimits?.has(userId) && Date.now() - client.rateLimits.get(userId) < RATE_LIMIT_MS) {
    return interaction.editReply({
      embeds: [client.embeds.createError('Rate Limited', 'Please wait before creating another ticket.')]
    });
  }
  if (TICKET_LOCK.has(userId)) {
    return interaction.editReply({
      embeds: [client.embeds.createError('Busy', 'Your previous ticket is still processing.')]
    });
  }
  TICKET_LOCK.add(userId);

  try {
    const existing = await client.db.getOpenTicket(interaction.guild.id, userId);
    if (existing) {
      return interaction.editReply({
        embeds: [client.embeds.createError('Ticket Exists', `You already have an open ticket: <#${existing.channelid}>`)]
      });
    }

    const settings = await client.db.getTicketSettings(interaction.guild.id);
    if (!settings.category || !settings.staffrole) {
      return interaction.editReply({
        embeds: [client.embeds.createError('Not Configured', 'Please use `/ticket setup` to configure the ticket system.')]
      });
    }

    const botMember = interaction.guild.members.me;
    if (!hasPerms(botMember, [FLAGS.ManageChannels, FLAGS.ViewChannel, FLAGS.SendMessages, FLAGS.ManagePermissions])) {
      return interaction.editReply({
        embeds: [client.embeds.createError('Missing Bot Perms', 'I need Manage Channels & Permissions permissions.')]
      });
    }

    // Create private text channel with accurate permission overwrites
    const channelName = `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 90);
    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parentId: settings.category,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [FLAGS.ViewChannel]
        },
        {
          id: userId,
          allow: [FLAGS.ViewChannel, FLAGS.SendMessages, FLAGS.ReadMessageHistory, FLAGS.AttachFiles]
        },
        {
          id: settings.staffrole,
          allow: [FLAGS.ViewChannel, FLAGS.SendMessages, FLAGS.ReadMessageHistory, FLAGS.ManageMessages]
        },
        {
          id: client.user.id,
          allow: [FLAGS.ViewChannel, FLAGS.SendMessages, FLAGS.ManageChannels, FLAGS.ManageMessages, FLAGS.ReadMessageHistory]
        }
      ]
    });

    // Save the staff role to ticket record (fix missing property)
    await client.db.createTicket({
      guildid: interaction.guild.id,
      userid: userId,
      channelid: channel.id,
      staffrole: settings.staffrole,
      createdat: new Date().toISOString()
    });

    // Send welcome message tagging staff & user with distinct close button ID
    const embed = client.embeds.createInfo('🎫 Ticket Created', 'A staff member will assist you shortly.');
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close_request')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
    );
    await channel.send({ content: `<@&${settings.staffrole}> <@${userId}>`, embeds: [embed], components: [row] });

    client.rateLimits = client.rateLimits || new Map();
    client.rateLimits.set(userId, Date.now());

    return interaction.editReply({
      embeds: [client.embeds.createSuccess('Ticket Opened', `Ticket channel created: <#${channel.id}>`)]
    });
  } finally {
    TICKET_LOCK.delete(userId);
  }
}

async function claimTicket(interaction, client) {
  const channel = interaction.channel;
  const ticket = await client.db.getTicketByChannel(channel.id);
  if (!ticket || ticket.closedat) {
    return interaction.editReply({
      embeds: [client.embeds.createError('Invalid', 'This channel is not an open ticket.')]
    });
  }
  if (!interaction.member.roles.cache.has(ticket.staffrole)) {
    return interaction.editReply({
      embeds: [client.embeds.createError('Forbidden', 'You are not ticket staff.')]
    });
  }
  if (ticket.claimedby) {
    return interaction.editReply({
      embeds: [client.embeds.createInfo('Already Claimed', `<@${ticket.claimedby}> has already claimed this ticket.`)]
    });
  }
  await client.db.claimTicket(ticket.id, interaction.user.id);
  return interaction.editReply({
    embeds: [client.embeds.createSuccess('Claimed', 'You claimed this ticket.')]
  });
}

async function confirmClose(interaction, client) {
  const channel = interaction.channel;
  const ticket = await client.db.getTicketByChannel(channel.id);
  if (!ticket || ticket.closedat) {
    return interaction.editReply({
      embeds: [client.embeds.createError('Invalid', 'This channel is not an open ticket.')]
    });
  }
  if (interaction.user.id !== ticket.userid && !interaction.member.roles.cache.has(ticket.staffrole)) {
    return interaction.editReply({
      embeds: [client.embeds.createError('Forbidden', 'Only the ticket owner or staff can close this ticket.')]
    });
  }
  const embed = client.embeds.createWarning('⚠️ Confirm Close', 'Are you sure you want to close this ticket?');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close_confirm')
      .setLabel('Yes, Close')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ticket_close_cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
  );
  return interaction.editReply({ embeds: [embed], components: [row] });
}

module.exports = { commands };