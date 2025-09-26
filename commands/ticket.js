const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChannelType, 
  PermissionFlagsBits, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField
} = require('discord.js');
const PermissionManager = require('../utils/permissions.js');
const EmbedManager = require('../utils/embeds.js');

const commands = [
  {
      data: new SlashCommandBuilder()
          .setName('ticket-setup')
          .setDescription('Setup the ticket system for your server')
          .addChannelOption(option =>
              option.setName('category')
                  .setDescription('Category where ticket channels will be created')
                  .addChannelTypes(ChannelType.GuildCategory)
                  .setRequired(true))
          .addChannelOption(option =>
              option.setName('log-channel')
                  .setDescription('Channel where ticket logs will be sent')
                  .addChannelTypes(ChannelType.GuildText)
                  .setRequired(true))
          .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
      name: 'ticket-setup',
      execute: async (interaction, client) => {
          try {
              const category = interaction.options.getChannel('category');
              const logChannel = interaction.options.getChannel('log-channel');
              const guildId = interaction.guild.id;

              // Save ticket settings to database using correct method signature
              client.db.setTicketSettings(
                  guildId,
                  category.id,
                  '',  // Empty staff roles initially
                  logChannel.id,
                  1    // Starting ticket number
              );

              const embed = new EmbedBuilder()
                  .setTitle('🎫 Ticket System Setup Complete')
                  .setDescription(`**Ticket Category:** ${category}\n**Log Channel:** ${logChannel}`)
                  .setColor('#00FF00')
                  .setTimestamp();

              await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          } catch (error) {
              console.error('Error in ticket setup:', error);
              client.logger.error('Error in ticket setup:', error);

              try {
                  if (!interaction.replied && !interaction.deferred) {
                      await interaction.reply({ 
                          content: '❌ Failed to setup ticket system. Please try again.', 
                          flags: MessageFlags.Ephemeral 
                      });
                  }
              } catch (replyError) {
                  console.error('Failed to send error message:', replyError);
              }
          }
      }
  },
  {
      data: new SlashCommandBuilder()
          .setName('ticket-panel')
          .setDescription('Create a ticket panel with customizable message and staff roles')
          .addStringOption(option =>
              option.setName('title')
                  .setDescription('Title for the ticket panel')
                  .setRequired(false))
          .addStringOption(option =>
              option.setName('description')
                  .setDescription('Description for the ticket panel')
                  .setRequired(false))
          .addStringOption(option =>
              option.setName('button-text')
                  .setDescription('Text for the create ticket button')
                  .setRequired(false))
          .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
      name: 'ticket-panel',
      execute: async (interaction, client) => {
          try {
              const guildId = interaction.guild.id;

              // Check if ticket system is setup
              let settings = client.db.getTicketSettings(guildId);
              if (!settings || !settings.categoryid) {
                  return await interaction.reply({
                      content: '❌ Please setup the ticket system first using `/ticket-setup`',
                      flags: MessageFlags.Ephemeral
                  });
              }

              // Get all roles excluding everyone and bot roles
              const roles = interaction.guild.roles.cache
                  .filter(role => 
                      role.id !== interaction.guild.id && 
                      !role.managed && 
                      role.name !== '@everyone'
                  )
                  .sort((a, b) => b.position - a.position)
                  .first(25); // Discord limit for select menu options

              if (roles.length === 0) {
                  return await interaction.reply({
                      content: '❌ No suitable roles found in this server.',
                      flags: MessageFlags.Ephemeral
                  });
              }

              // Create select menu options properly
              const selectOptions = roles.map(role => 
                  new StringSelectMenuOptionBuilder()
                      .setLabel(role.name.substring(0, 100)) // Ensure label isn't too long
                      .setValue(role.id)
                      .setDescription(`Members: ${role.members.size}`.substring(0, 100))
              );

              const selectMenu = new StringSelectMenuBuilder()
                  .setCustomId('ticket_staff_roles') // This matches your interaction handler
                  .setPlaceholder('Select staff roles for tickets')
                  .setMinValues(1)
                  .setMaxValues(Math.min(roles.length, 10))
                  .addOptions(selectOptions);

              const row = new ActionRowBuilder().addComponents(selectMenu);

              // Store panel data temporarily with expiration
              const panelData = {
                  title: interaction.options.getString('title') || '🎫 Support Tickets',
                  description: interaction.options.getString('description') || 'Click the button below to create a support ticket. Our staff will assist you shortly!',
                  buttonText: interaction.options.getString('button-text') || '📝 Create Ticket',
                  guildId: guildId,
                  userId: interaction.user.id,
                  timestamp: Date.now()
              };

              // Initialize map if it doesn't exist
              if (!client.tempPanelData) client.tempPanelData = new Map();

              // Store with a unique key
              const storageKey = interaction.user.id + guildId;
              client.tempPanelData.set(storageKey, panelData);

              // Clean up old data older than 5 minutes
              const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
              for (const [key, data] of client.tempPanelData.entries()) {
                  if (data.timestamp < fiveMinutesAgo) {
                      client.tempPanelData.delete(key);
                  }
              }

              // Reply with the select menu - using flags instead of ephemeral
              await interaction.reply({
                  content: '👥 **Step 1:** Select the staff roles that should have access to tickets:',
                  components: [row],
                  flags: MessageFlags.Ephemeral
              });

          } catch (error) {
              console.error('Error in ticket panel command:', error);
              client.logger.error('Error in ticket panel:', error);

              // Better error handling for interaction states
              const errorContent = '❌ Failed to create ticket panel. Please try again.';

              try {
                  if (!interaction.replied && !interaction.deferred) {
                      await interaction.reply({ 
                          content: errorContent, 
                          flags: MessageFlags.Ephemeral 
                      });
                  } else if (interaction.deferred) {
                      await interaction.editReply({ content: errorContent });
                  }
              } catch (replyError) {
                  console.error('Failed to send error message:', replyError);
              }
          }
      }
  },
  {
      data: new SlashCommandBuilder()
          .setName('ticket-close')
          .setDescription('Close the current ticket')
          .addStringOption(option =>
              option.setName('reason')
                  .setDescription('Reason for closing the ticket')
                  .setRequired(false))
          .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
      name: 'ticket-close',
      execute: async (interaction, client) => {
          try {
              const channelId = interaction.channel.id;

              // Try multiple methods to find ticket
              let ticket = null;

              // Method 1: Direct lookup by channel and status
              ticket = client.db.getTicketByChannel(channelId);

              // Method 2: Search all open tickets if direct lookup fails
              if (!ticket) {
                  const allTickets = client.db.getOpenTickets(interaction.guild.id);
                  ticket = allTickets.find(t => t.channelid === channelId);
              }

              // Method 3: Search by any status if still not found
              if (!ticket) {
                  const stmt = client.db.db.prepare('SELECT * FROM tickets WHERE channelid = ?');
                  ticket = stmt.get(channelId);
              }

              if (!ticket) {
                  return await interaction.reply({
                      content: '❌ This command can only be used in ticket channels.',
                      flags: MessageFlags.Ephemeral
                  });
              }

              // Defer reply to prevent timeout
              await interaction.deferReply();

              const reason = interaction.options.getString('reason') || 'No reason provided';

              // Create closing confirmation embed
              const embed = new EmbedBuilder()
                  .setTitle('🔒 Ticket Closing')
                  .setDescription(`**Ticket #${ticket.ticketnumber}** closed by ${interaction.user}\n**Reason:** ${reason}\n\nThis channel will be deleted in 10 seconds...`)
                  .setColor('#FF0000')
                  .setTimestamp();

              // Close ticket in database
              client.db.closeTicket(ticket.id, interaction.user.id);

              // Log to log channel
              const settings = client.db.getTicketSettings(interaction.guild.id);
              if (settings && settings.logchannelid) {
                  const logChannel = interaction.guild.channels.cache.get(settings.logchannelid);
                  if (logChannel) {
                      const logEmbed = new EmbedBuilder()
                          .setTitle('🔒 Ticket Closed')
                          .addFields(
                              { name: 'Ticket Number', value: `#${ticket.ticketnumber}`, inline: true },
                              { name: 'Created by', value: `<@${ticket.userid}>`, inline: true },
                              { name: 'Closed by', value: interaction.user.toString(), inline: true },
                              { name: 'Reason', value: reason, inline: false },
                              { name: 'Channel', value: interaction.channel.name, inline: true }
                          )
                          .setColor('#FF0000')
                          .setTimestamp();

                      await logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                  }
              }

              // Edit the deferred reply
              await interaction.editReply({ embeds: [embed] });

              // Delete channel after 10 seconds
              setTimeout(async () => {
                  try {
                      if (interaction.channel && !interaction.channel.deleted) {
                          await interaction.channel.delete('Ticket closed');
                      }
                  } catch (error) {
                      console.error('Error deleting ticket channel:', error);
                      client.logger.error('Error deleting ticket channel:', error);
                  }
              }, 10000);

          } catch (error) {
              console.error('Error closing ticket:', error);
              client.logger.error('Error closing ticket:', error);

              try {
                  if (interaction.deferred) {
                      await interaction.editReply({ 
                          content: '❌ Failed to close ticket. Please try again.' 
                      });
                  } else if (!interaction.replied) {
                      await interaction.reply({ 
                          content: '❌ Failed to close ticket. Please try again.', 
                          flags: MessageFlags.Ephemeral 
                      });
                  }
              } catch (replyError) {
                  console.error('Failed to send error response:', replyError);
              }
          }
      }
  }
];

module.exports = { commands };
