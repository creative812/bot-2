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
    MessageFlags
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

                // Use the CORRECT database method signature from your code
                client.db.setTicketSettings(
                    guildId,        // guildId
                    category.id,    // categoryId  
                    '',            // staffRoleIds (empty initially)
                    logChannel.id, // logChannelId
                    1              // nextTicketNumber
                );

                const embed = new EmbedBuilder()
                    .setTitle('🎫 Ticket System Setup Complete')
                    .setDescription(`**Ticket Category:** ${category}\n**Log Channel:** ${logChannel}`)
                    .setColor('#00FF00')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

                console.log('✅ Ticket setup completed for guild:', guildId);

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
                console.log('🔍 Ticket settings found:', settings);

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
                    .first(25);

                if (roles.length === 0) {
                    return await interaction.reply({
                        content: '❌ No suitable roles found in this server.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const selectOptions = roles.map(role => 
                    new StringSelectMenuOptionBuilder()
                        .setLabel(role.name.substring(0, 100))
                        .setValue(role.id)
                        .setDescription(`Members: ${role.members.size}`.substring(0, 100))
                );

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('ticket_staff_roles')
                    .setPlaceholder('Select staff roles for tickets')
                    .setMinValues(1)
                    .setMaxValues(Math.min(roles.length, 10))
                    .addOptions(selectOptions);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const panelData = {
                    title: interaction.options.getString('title') || '🎫 Support Tickets',
                    description: interaction.options.getString('description') || 'Click the button below to create a support ticket. Our staff will assist you shortly!',
                    buttonText: interaction.options.getString('button-text') || '📝 Create Ticket',
                    guildId: guildId,
                    userId: interaction.user.id,
                    timestamp: Date.now()
                };

                if (!client.tempPanelData) client.tempPanelData = new Map();

                const storageKey = interaction.user.id + guildId;
                client.tempPanelData.set(storageKey, panelData);

                // Clean up old data older than 5 minutes
                const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
                for (const [key, data] of client.tempPanelData.entries()) {
                    if (data.timestamp < fiveMinutesAgo) {
                        client.tempPanelData.delete(key);
                    }
                }

                await interaction.reply({
                    content: '👥 **Step 1:** Select the staff roles that should have access to tickets:',
                    components: [row],
                    flags: MessageFlags.Ephemeral
                });

            } catch (error) {
                console.error('Error in ticket panel command:', error);
                client.logger.error('Error in ticket panel:', error);

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
    }
];

module.exports = { commands };
