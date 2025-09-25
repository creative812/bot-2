const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');

/**
 * Admin Commands - Clean and Modular Structure
 * 
 * This file contains all admin-level commands with:
 * - Consistent error handling
 * - Proper permission validation
 * - Clean code structure
 * - Centralized database calls (to be connected via services)
 * - Modular command definitions
 */

const commands = [
    {
        name: 'settings',
        description: 'Manage server settings and configuration',
        permissions: 'admin',
        data: new SlashCommandBuilder()
            .setName('settings')
            .setDescription('Manage server settings and configuration')
            .addSubcommand(subcommand => 
                subcommand
                    .setName('view')
                    .setDescription('View current server settings'))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('prefix')
                    .setDescription('Set the command prefix')
                    .addStringOption(option =>
                        option
                            .setName('prefix')
                            .setDescription('New command prefix (max 5 characters)')
                            .setMaxLength(5)
                            .setRequired(true)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('log-channel')
                    .setDescription('Set the moderation log channel')
                    .addChannelOption(option =>
                        option
                            .setName('channel')
                            .setDescription('Channel for moderation logs')
                            .setRequired(false)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('welcome-channel')
                    .setDescription('Set the welcome/leave channel')
                    .addChannelOption(option =>
                        option
                            .setName('channel')
                            .setDescription('Channel for welcome/leave messages')
                            .setRequired(false)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('welcome-message')
                    .setDescription('Set custom welcome message')
                    .addStringOption(option =>
                        option
                            .setName('message')
                            .setDescription('Welcome message (use {user} for mention, {server} for server name)')
                            .setMaxLength(1000)
                            .setRequired(false)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('leave-message')
                    .setDescription('Set custom leave message')
                    .addStringOption(option =>
                        option
                            .setName('message')
                            .setDescription('Leave message (use {user} for username, {server} for server name)')
                            .setMaxLength(1000)
                            .setRequired(false)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('embed-color')
                    .setDescription('Set default embed color')
                    .addStringOption(option =>
                        option
                            .setName('color')
                            .setDescription('Hex color code (e.g., 7289DA)')
                            .setRequired(true)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('automod')
                    .setDescription('Toggle auto-moderation system')
                    .addBooleanOption(option =>
                        option
                            .setName('enabled')
                            .setDescription('Enable or disable auto-moderation')
                            .setRequired(true))),

        async execute(interaction, client) {
            // Permission check will be handled by PermissionService
            if (!await client.permissions.isAdmin(interaction.member)) {
                return interaction.reply({
                    embeds: [client.embeds.createError('Permission Denied', 'You need administrator permissions to use this command.')],
                    ephemeral: true
                });
            }

            const subcommand = interaction.options.getSubcommand();

            try {
                switch (subcommand) {
                    case 'view':
                        await handleViewSettings(interaction, client);
                        break;
                    case 'prefix':
                        await handleSetPrefix(interaction, client);
                        break;
                    case 'log-channel':
                        await handleLogChannel(interaction, client);
                        break;
                    case 'welcome-channel':
                        await handleWelcomeChannel(interaction, client);
                        break;
                    case 'welcome-message':
                        await handleWelcomeMessage(interaction, client);
                        break;
                    case 'leave-message':
                        await handleLeaveMessage(interaction, client);
                        break;
                    case 'embed-color':
                        await handleEmbedColor(interaction, client);
                        break;
                    case 'automod':
                        await handleAutomod(interaction, client);
                        break;
                }
            } catch (error) {
                client.logger.error('Error in settings command:', error);
                const errorEmbed = client.embeds.createError('Error', 'An error occurred while updating settings.');

                if (interaction.deferred) {
                    await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
        }
    },

    {
        name: 'backup',
        description: 'Create or manage server data backups',
        permissions: 'admin',
        data: new SlashCommandBuilder()
            .setName('backup')
            .setDescription('Create or manage server data backups')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('create')
                    .setDescription('Create a backup of server data'))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('info')
                    .setDescription('Show backup information and statistics')),

        async execute(interaction, client) {
            if (!await client.permissions.isAdmin(interaction.member)) {
                return interaction.reply({
                    embeds: [client.embeds.createError('Permission Denied', 'You need administrator permissions to use this command.')],
                    ephemeral: true
                });
            }

            const subcommand = interaction.options.getSubcommand();

            try {
                switch (subcommand) {
                    case 'create':
                        await handleCreateBackup(interaction, client);
                        break;
                    case 'info':
                        await handleBackupInfo(interaction, client);
                        break;
                }
            } catch (error) {
                client.logger.error('Error in backup command:', error);
                const errorEmbed = client.embeds.createError('Error', 'An error occurred while managing backup.');

                if (interaction.deferred) {
                    await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
        }
    },

    {
        name: 'manage-command',
        description: 'Enable or disable bot commands',
        permissions: 'admin',
        data: new SlashCommandBuilder()
            .setName('manage-command')
            .setDescription('Enable or disable bot commands')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('disable')
                    .setDescription('Disable a command')
                    .addStringOption(option =>
                        option
                            .setName('command')
                            .setDescription('Command name to disable')
                            .setRequired(true)
                            .setAutocomplete(true))
                    .addStringOption(option =>
                        option
                            .setName('reason')
                            .setDescription('Reason for disabling the command')
                            .setRequired(false)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('enable')
                    .setDescription('Enable a previously disabled command')
                    .addStringOption(option =>
                        option
                            .setName('command')
                            .setDescription('Command name to enable')
                            .setRequired(true)
                            .setAutocomplete(true)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('list')
                    .setDescription('List all disabled commands'))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('status')
                    .setDescription('Check if a command is enabled or disabled')
                    .addStringOption(option =>
                        option
                            .setName('command')
                            .setDescription('Command name to check')
                            .setRequired(true)
                            .setAutocomplete(true))),

        async execute(interaction, client) {
            if (!await client.permissions.isAdmin(interaction.member)) {
                return interaction.reply({
                    embeds: [client.embeds.createError('Permission Denied', 'You need administrator permissions to use this command.')],
                    ephemeral: true
                });
            }

            const subcommand = interaction.options.getSubcommand();

            try {
                switch (subcommand) {
                    case 'disable':
                        await handleDisableCommand(interaction, client);
                        break;
                    case 'enable':
                        await handleEnableCommand(interaction, client);
                        break;
                    case 'list':
                        await handleListDisabled(interaction, client);
                        break;
                    case 'status':
                        await handleCommandStatus(interaction, client);
                        break;
                }
            } catch (error) {
                client.logger.error('Error in manage-command:', error);
                await interaction.reply({
                    embeds: [client.embeds.createError('Error', 'An error occurred while managing the command.')],
                    ephemeral: true
                });
            }
        },

        async autocomplete(interaction) {
            const focusedOption = interaction.options.getFocused(true);
            const subcommand = interaction.options.getSubcommand();

            if (focusedOption.name === 'command') {
                let choices = [];

                try {
                    if (subcommand === 'disable' || subcommand === 'status') {
                        // Show all available commands except protected ones
                        const protectedCommands = ['manage-command', 'help', 'settings'];
                        choices = Array.from(interaction.client.commands.keys())
                            .filter(cmd => !protectedCommands.includes(cmd))
                            .filter(cmd => cmd.toLowerCase().includes(focusedOption.value.toLowerCase()))
                            .slice(0, 25)
                            .sort();
                    } else if (subcommand === 'enable') {
                        // Show only disabled commands
                        const disabledCommands = await interaction.client.db.getDisabledCommands(interaction.guild.id);
                        choices = disabledCommands
                            .map(cmd => cmd.commandname)
                            .filter(cmd => cmd.toLowerCase().includes(focusedOption.value.toLowerCase()))
                            .slice(0, 25)
                            .sort();
                    }

                    await interaction.respond(
                        choices.map(choice => ({ name: choice, value: choice }))
                    );
                } catch (error) {
                    console.error('Error in manage-command autocomplete:', error);
                    await interaction.respond([]);
                }
            }
        }
    }
];

// Helper functions for settings command
async function handleViewSettings(interaction, client) {
    const settings = await client.db.getGuildSettings(interaction.guild.id);

    const logChannel = settings.logchannelid ? `<#${settings.logchannelid}>` : 'Not set';
    const welcomeChannel = settings.welcomechannelid ? `<#${settings.welcomechannelid}>` : 'Not set';
    const autoRole = settings.autoroleid ? `<@&${settings.autoroleid}>` : 'Not set';

    const embed = client.embeds.createInfo('⚙️ Server Settings', 'Current server configuration')
        .addFields(
            { name: '📝 Prefix', value: settings.prefix || '!', inline: true },
            { name: '📋 Log Channel', value: logChannel, inline: true },
            { name: '👋 Welcome Channel', value: welcomeChannel, inline: true },
            { name: '🎭 Auto Role', value: autoRole, inline: true },
            { name: '🎨 Embed Color', value: `#${settings.embedcolor || '7289DA'}`, inline: true },
            { name: '🛡️ Auto-Moderation', value: settings.automodenabled ? 'Enabled' : 'Disabled', inline: true },
            { name: '💬 Welcome Message', value: settings.welcomemessage || 'Default message', inline: false },
            { name: '👋 Leave Message', value: settings.leavemessage || 'Default message', inline: false }
        );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSetPrefix(interaction, client) {
    const newPrefix = interaction.options.getString('prefix');

    if (newPrefix.length > 5) {
        return interaction.reply({
            embeds: [client.embeds.createError('Invalid Prefix', 'Prefix must be 5 characters or less.')],
            ephemeral: true
        });
    }

    await client.db.setGuildSetting(interaction.guild.id, 'prefix', newPrefix);

    const embed = client.embeds.createSuccess('✅ Prefix Updated', `Command prefix has been set to \`${newPrefix}\``);
    await interaction.reply({ embeds: [embed] });
}

async function handleLogChannel(interaction, client) {
    const channel = interaction.options.getChannel('channel');

    if (channel) {
        // Check bot permissions
        if (!await client.permissions.botHasPermissions(channel, ['SendMessages', 'EmbedLinks'])) {
            return interaction.reply({
                embeds: [client.embeds.createError('Missing Permissions', 'I need Send Messages and Embed Links permissions in that channel.')],
                ephemeral: true
            });
        }

        await client.db.setGuildSetting(interaction.guild.id, 'logchannelid', channel.id);

        const embed = client.embeds.createSuccess('📋 Log Channel Set', `Moderation logs will now be sent to ${channel}.`);
        await interaction.reply({ embeds: [embed] });
    } else {
        await client.db.setGuildSetting(interaction.guild.id, 'logchannelid', null);

        const embed = client.embeds.createSuccess('📋 Log Channel Removed', 'Moderation logging has been disabled.');
        await interaction.reply({ embeds: [embed] });
    }
}

async function handleWelcomeChannel(interaction, client) {
    const channel = interaction.options.getChannel('channel');

    if (channel) {
        if (!await client.permissions.botHasPermissions(channel, ['SendMessages', 'EmbedLinks'])) {
            return interaction.reply({
                embeds: [client.embeds.createError('Missing Permissions', 'I need Send Messages and Embed Links permissions in that channel.')],
                ephemeral: true
            });
        }

        await client.db.setGuildSetting(interaction.guild.id, 'welcomechannelid', channel.id);

        const embed = client.embeds.createSuccess('👋 Welcome Channel Set', `Welcome and leave messages will now be sent to ${channel}.`);
        await interaction.reply({ embeds: [embed] });
    } else {
        await client.db.setGuildSetting(interaction.guild.id, 'welcomechannelid', null);

        const embed = client.embeds.createSuccess('👋 Welcome Channel Removed', 'Welcome and leave messages have been disabled.');
        await interaction.reply({ embeds: [embed] });
    }
}

async function handleWelcomeMessage(interaction, client) {
    const message = interaction.options.getString('message');

    await client.db.setGuildSetting(interaction.guild.id, 'welcomemessage', message);

    const embed = client.embeds.createSuccess(
        '💬 Welcome Message Updated', 
        message ? `Welcome message set to: ${message}` : 'Welcome message reset to default.'
    );
    await interaction.reply({ embeds: [embed] });
}

async function handleLeaveMessage(interaction, client) {
    const message = interaction.options.getString('message');

    await client.db.setGuildSetting(interaction.guild.id, 'leavemessage', message);

    const embed = client.embeds.createSuccess(
        '👋 Leave Message Updated', 
        message ? `Leave message set to: ${message}` : 'Leave message reset to default.'
    );
    await interaction.reply({ embeds: [embed] });
}

async function handleEmbedColor(interaction, client) {
    const color = interaction.options.getString('color');

    // Validate hex color
    if (!/^[0-9A-F]{6}$/i.test(color)) {
        return interaction.reply({
            embeds: [client.embeds.createError('Invalid Color', 'Please provide a valid hex color code (e.g., 7289DA).')],
            ephemeral: true
        });
    }

    await client.db.setGuildSetting(interaction.guild.id, 'embedcolor', color);

    const embed = client.embeds.createCustom('🎨 Embed Color Updated', `Default embed color has been set to #${color}`, `#${color}`);
    await interaction.reply({ embeds: [embed] });
}

async function handleAutomod(interaction, client) {
    const enabled = interaction.options.getBoolean('enabled');

    await client.db.setGuildSetting(interaction.guild.id, 'automodenabled', enabled ? 1 : 0);

    const embed = client.embeds.createSuccess('🛡️ Auto-Moderation Updated', `Auto-moderation has been ${enabled ? 'enabled' : 'disabled'}.`);
    await interaction.reply({ embeds: [embed] });
}

// Helper functions for backup command
async function handleCreateBackup(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    // Create database backup
    const backupPath = await client.db.createBackup();

    // Create backup info
    const backupInfo = {
        guildid: interaction.guild.id,
        guildname: interaction.guild.name,
        createdat: new Date().toISOString(),
        createdby: interaction.user.tag,
        membercount: interaction.guild.memberCount,
        settings: await client.db.getGuildSettings(interaction.guild.id),
        warningscount: (await client.db.getWarnings(interaction.guild.id, 0)).length,
        selfrolescount: (await client.db.getSelfRoles(interaction.guild.id)).length
    };

    // Create info file
    const fs = require('fs');
    const infoPath = backupPath.replace('.db', '_info.json');
    fs.writeFileSync(infoPath, JSON.stringify(backupInfo, null, 2));

    // Create attachment
    const attachment = new AttachmentBuilder(infoPath, { name: `backup_info_${Date.now()}.json` });

    const embed = client.embeds.createSuccess('💾 Backup Created', 'Database backup has been created successfully.')
        .addFields(
            { name: '📊 Guild', value: interaction.guild.name, inline: true },
            { name: '👥 Members', value: backupInfo.membercount.toString(), inline: true },
            { name: '📅 Created', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        );

    await interaction.editReply({ embeds: [embed], files: [attachment] });

    // Cleanup
    fs.unlinkSync(infoPath);
}

async function handleBackupInfo(interaction, client) {
    const settings = await client.db.getGuildSettings(interaction.guild.id);
    const warnings = await client.db.getWarnings(interaction.guild.id, 0);
    const selfRoles = await client.db.getSelfRoles(interaction.guild.id);
    const modLogs = await client.db.getModLogs(interaction.guild.id, 100);

    const embed = client.embeds.createInfo('ℹ️ Backup Information', 'Current server data that would be included in a backup')
        .addFields(
            { name: '⚙️ Settings Configured', value: Object.keys(settings).length.toString(), inline: true },
            { name: '⚠️ Total Warnings', value: warnings.length.toString(), inline: true },
            { name: '🎭 Self-Roles', value: selfRoles.length.toString(), inline: true },
            { name: '📋 Moderation Logs', value: modLogs.length.toString(), inline: true },
            { name: '💾 Last Backup', value: 'Use `/backup create` to create one', inline: false }
        );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

// Helper functions for manage-command
async function handleDisableCommand(interaction, client) {
    const commandName = interaction.options.getString('command');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Prevent disabling critical commands
    const protectedCommands = ['manage-command', 'help', 'settings'];
    if (protectedCommands.includes(commandName)) {
        return interaction.reply({
            embeds: [client.embeds.createError('Cannot Disable', `The command \`${commandName}\` cannot be disabled as it's protected.`)],
            ephemeral: true
        });
    }

    // Check if command exists
    const command = client.commands.get(commandName);
    if (!command) {
        return interaction.reply({
            embeds: [client.embeds.createError('Command Not Found', `No command found with the name \`${commandName}\`.`)],
            ephemeral: true
        });
    }

    // Check if already disabled
    const existing = await client.db.getDisabledCommand(interaction.guild.id, commandName);
    if (existing) {
        return interaction.reply({
            embeds: [client.embeds.createError('Already Disabled', `Command \`${commandName}\` is already disabled.`)],
            ephemeral: true
        });
    }

    // Disable the command
    await client.db.disableCommand(interaction.guild.id, commandName, interaction.user.id, reason);

    const embed = client.embeds.createSuccess('🚫 Command Disabled', `Successfully disabled command \`${commandName}\`.`)
        .addFields(
            { name: '📝 Reason', value: reason, inline: false },
            { name: '👤 Disabled By', value: interaction.user.tag, inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        );

    await interaction.reply({ embeds: [embed] });

    // Log the action
    await client.db.addModLog(interaction.guild.id, 'Command Disabled', 'N/A', interaction.user.id, `Disabled command: ${commandName} - Reason: ${reason}`);
}

async function handleEnableCommand(interaction, client) {
    const commandName = interaction.options.getString('command');

    // Check if command is disabled
    const disabled = await client.db.getDisabledCommand(interaction.guild.id, commandName);
    if (!disabled) {
        return interaction.reply({
            embeds: [client.embeds.createError('Not Disabled', `Command \`${commandName}\` is not disabled.`)],
            ephemeral: true
        });
    }

    // Enable the command
    await client.db.enableCommand(interaction.guild.id, commandName);

    const embed = client.embeds.createSuccess('✅ Command Enabled', `Successfully enabled command \`${commandName}\`.`)
        .addFields(
            { name: '👤 Previously Disabled By', value: disabled.disabledby, inline: true },
            { name: '📝 Original Reason', value: disabled.reason || 'No reason provided', inline: false },
            { name: '👤 Enabled By', value: interaction.user.tag, inline: true },
            { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        );

    await interaction.reply({ embeds: [embed] });

    // Log the action
    await client.db.addModLog(interaction.guild.id, 'Command Enabled', 'N/A', interaction.user.id, `Enabled command: ${commandName}`);
}

async function handleListDisabled(interaction, client) {
    const disabledCommands = await client.db.getDisabledCommands(interaction.guild.id);

    if (disabledCommands.length === 0) {
        return interaction.reply({
            embeds: [client.embeds.createInfo('📋 Disabled Commands', 'No commands are currently disabled.')],
            ephemeral: true
        });
    }

    const commandList = disabledCommands.map((cmd, index) => {
        const disabledDate = new Date(cmd.createdat).getTime();
        return `${index + 1}. **${cmd.commandname}**\n` +
               `📝 Reason: ${cmd.reason || 'No reason provided'}\n` +
               `👤 By: ${cmd.disabledby}\n` +
               `📅 <t:${Math.floor(disabledDate / 1000)}:R>`;
    }).join('\n\n');

    const embed = client.embeds.createInfo('🚫 Disabled Commands', `Found ${disabledCommands.length} disabled command(s)`)
        .setColor('#FFA500');

    // Handle long lists
    if (commandList.length > 4096) {
        embed.setDescription(commandList.substring(0, 4000) + '\n\n...(truncated)');
        embed.setFooter({ text: 'List truncated due to length. Use individual status checks for full details.' });
    } else {
        embed.setDescription(commandList);
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleCommandStatus(interaction, client) {
    const commandName = interaction.options.getString('command');

    // Check if command exists
    const command = client.commands.get(commandName);
    if (!command) {
        return interaction.reply({
            embeds: [client.embeds.createError('Command Not Found', `No command found with the name \`${commandName}\`.`)],
            ephemeral: true
        });
    }

    const disabled = await client.db.getDisabledCommand(interaction.guild.id, commandName);

    if (disabled) {
        const disabledDate = new Date(disabled.createdat).getTime();
        const embed = client.embeds.createInfo('🚫 Command Status', `Command \`${commandName}\` is **DISABLED**`)
            .setColor('#FF0000')
            .addFields(
                { name: '📝 Reason', value: disabled.reason || 'No reason provided', inline: false },
                { name: '👤 Disabled By', value: disabled.disabledby, inline: true },
                { name: '📅 Date', value: `<t:${Math.floor(disabledDate / 1000)}:F>`, inline: true },
                { name: '⏰ Duration', value: `<t:${Math.floor(disabledDate / 1000)}:R>`, inline: true }
            );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
        const embed = client.embeds.createInfo('✅ Command Status', `Command \`${commandName}\` is **ENABLED**`)
            .setColor('#00FF00')
            .addFields(
                { name: '🔒 Permissions', value: command.permissions ? command.permissions.charAt(0).toUpperCase() + command.permissions.slice(1) : 'None', inline: true },
                { name: '📝 Description', value: command.description || 'No description available', inline: false }
            );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

module.exports = {
    commands
};
