const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

/**
 * AI Commands - Clean and Refined Structure
 * 
 * Features:
 * - Dual personality system (Yuki/Sylus)
 * - Memory management and conversation history
 * - Interactive games and status tracking
 * - Channel-based and trigger-based AI responses
 * - Advanced settings management
 */

const AI_PERSONALITIES = {
    yuki: {
        name: 'Yuki',
        emoji: '🌸',
        description: 'Shy, caring, and gentle - like a sweet companion who\'s always there for you',
        color: '#FFB6C1',
        traits: [
            'Soft, caring responses with gentle charm',
            'Context-aware conversations with empathy',
            'Remembers your preferences and mood',
            'Shy but warming up over time'
        ],
        greeting: 'Hi there! I\'m Yuki, your shy and caring AI companion who loves talking with you... 🌸'
    },
    sylus: {
        name: 'Sylus',
        emoji: '⚡',
        description: 'Cool, composed, and protective - mysterious charm with subtle confidence',
        color: '#6c5ce7',
        traits: [
            'Cool, composed responses with subtle charm',
            'Context-aware conversations with confidence',
            'Protective and reliable presence',
            'Calm demeanor with hidden depth'
        ],
        greeting: 'Hey there. I\'m Sylus, your calm and composed AI companion. I keep things cool and collected.'
    }
};

const CONVERSATION_GAMES = {
    '20questions': {
        name: '20 Questions',
        description: 'I think of something, you guess what it is!',
        items: ['Dragon', 'Smartphone', 'Pizza', 'Rainbow', 'Guitar', 'Castle', 'Ocean', 'Mountain', 'Robot', 'Butterfly'],
        intro: {
            yuki: 'Oh, this sounds fun! 🌸 I\'ve thought of something... ',
            sylus: 'Interesting choice. I\'ve selected something... '
        }
    },
    storytelling: {
        name: 'Story Building',
        description: 'We create a story together, taking turns!',
        starters: [
            'Once upon a time, in a mystical forest...',
            'The spaceship landed on an unknown planet...',
            'She found an old diary in the attic...',
            'The last person on Earth sat alone...',
            'Magic returned to the modern world when...'
        ],
        intro: {
            yuki: 'I love stories! 📚 Let\'s create something beautiful together. Here\'s our beginning: ',
            sylus: 'Stories reveal truths. Let\'s craft something interesting. Our tale begins: '
        }
    },
    wouldyourather: {
        name: 'Would You Rather',
        description: 'Fun choices and interesting dilemmas!',
        questions: [
            'fly or be invisible?',
            'read minds or predict the future?',
            'live underwater or in space?',
            'have super strength or super speed?',
            'time travel to the past or future?'
        ],
        intro: {
            yuki: 'These choices are always so interesting! 💭 Would you rather... ',
            sylus: 'Choices define us. Here\'s an interesting dilemma: Would you rather... '
        }
    },
    riddles: {
        name: 'Riddle Time',
        description: 'Brain teasers and puzzles to solve!',
        riddles: [
            { question: 'What has keys but no locks, space but no room?', answer: 'keyboard' },
            { question: 'The more you take, the more you leave behind. What am I?', answer: 'footsteps' },
            { question: 'What comes once in a minute, twice in a moment, never in a thousand years?', answer: 'letter m' },
            { question: 'What has hands but cannot clap?', answer: 'clock' }
        ],
        intro: {
            yuki: 'I love puzzles! 🧩 Here\'s a riddle for you: ',
            sylus: 'Let\'s test that mind of yours. Here\'s a challenge: '
        }
    }
};

const commands = [
    {
        name: 'ai',
        description: 'Configure AI chat settings and features',
        permissions: 'moderator',
        data: new SlashCommandBuilder()
            .setName('ai')
            .setDescription('Configure AI chat settings and features')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('toggle')
                    .setDescription('Enable or disable AI responses')
                    .addBooleanOption(option =>
                        option
                            .setName('enabled')
                            .setDescription('Enable or disable AI chat')
                            .setRequired(true))
                    .addChannelOption(option =>
                        option
                            .setName('channel')
                            .setDescription('Specific channel for AI (optional)')
                            .setRequired(false)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('personality')
                    .setDescription('Set AI personality type')
                    .addStringOption(option =>
                        option
                            .setName('type')
                            .setDescription('Choose personality style')
                            .setRequired(true)
                            .addChoices(
                                { name: '🌸 Yuki - Shy & Caring (Gentle Sweetheart)', value: 'yuki' },
                                { name: '⚡ Sylus - Cool & Protective (Mysterious Charm)', value: 'sylus' }
                            )))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('trigger')
                    .setDescription('Set the symbol that triggers AI responses')
                    .addStringOption(option =>
                        option
                            .setName('symbol')
                            .setDescription('Trigger symbol (e.g., !, ?, ~)')
                            .setRequired(true)
                            .setMaxLength(5)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('channels')
                    .setDescription('Manage AI-enabled channels')
                    .addStringOption(option =>
                        option
                            .setName('action')
                            .setDescription('Add or remove channel')
                            .setRequired(true)
                            .addChoices(
                                { name: 'Add Channel', value: 'add' },
                                { name: 'Remove Channel', value: 'remove' },
                                { name: 'List Channels', value: 'list' },
                                { name: 'Clear All', value: 'clear' }
                            ))
                    .addChannelOption(option =>
                        option
                            .setName('channel')
                            .setDescription('Channel to add/remove (required for add/remove)')
                            .setRequired(false)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('status')
                    .setDescription('View AI system status and statistics'))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('clear')
                    .setDescription('Clear conversation memory')
                    .addStringOption(option =>
                        option
                            .setName('scope')
                            .setDescription('What to clear')
                            .setRequired(true)
                            .addChoices(
                                { name: 'My Memory Only', value: 'user' },
                                { name: 'This Channel', value: 'channel' },
                                { name: 'All Server Memory', value: 'server' }
                            )))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('game')
                    .setDescription('Start a conversation game with AI')
                    .addStringOption(option =>
                        option
                            .setName('type')
                            .setDescription('Choose a game to play')
                            .setRequired(true)
                            .addChoices(
                                { name: '🎯 20 Questions - Guess what I\'m thinking!', value: '20questions' },
                                { name: '📚 Story Building - Create stories together!', value: 'storytelling' },
                                { name: '🤔 Would You Rather - Fun choices!', value: 'wouldyourather' },
                                { name: '🧩 Riddle Time - Brain teasers!', value: 'riddles' }
                            )))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('reset')
                    .setDescription('Reset all AI settings to defaults')),

        async execute(interaction, client) {
            // Permission check
            if (!await client.permissions.isModerator(interaction.member)) {
                return interaction.reply({
                    embeds: [client.embeds.createError('Permission Denied', 'You need moderator permissions to configure AI settings.')],
                    ephemeral: true
                });
            }

            const subcommand = interaction.options.getSubcommand();

            try {
                await interaction.deferReply();

                switch (subcommand) {
                    case 'toggle':
                        await handleToggle(interaction, client);
                        break;
                    case 'personality':
                        await handlePersonality(interaction, client);
                        break;
                    case 'trigger':
                        await handleTrigger(interaction, client);
                        break;
                    case 'channels':
                        await handleChannels(interaction, client);
                        break;
                    case 'status':
                        await handleStatus(interaction, client);
                        break;
                    case 'clear':
                        await handleClear(interaction, client);
                        break;
                    case 'game':
                        await handleGame(interaction, client);
                        break;
                    case 'reset':
                        await handleReset(interaction, client);
                        break;
                    default:
                        await interaction.editReply({
                            embeds: [client.embeds.createError('Unknown Command', 'Unknown AI subcommand. Please try again.')],
                            ephemeral: true
                        });
                }
            } catch (error) {
                client.logger.error('Error in AI command:', error);
                const errorEmbed = client.embeds.createError('Error', 'An error occurred while processing the AI command.');

                if (interaction.deferred) {
                    await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
        }
    },

    // Quick AI commands for common actions
    {
        name: 'ai-chat',
        description: 'Quick toggle AI chat in current channel',
        permissions: 'user',
        data: new SlashCommandBuilder()
            .setName('ai-chat')
            .setDescription('Quick toggle AI chat in current channel')
            .addStringOption(option =>
                option
                    .setName('message')
                    .setDescription('Message to send to AI (if enabled)')
                    .setRequired(false)),

        async execute(interaction, client) {
            try {
                await interaction.deferReply();

                const message = interaction.options.getString('message');
                const settings = await client.db.getAISettings(interaction.guild.id);

                if (!settings || !settings.aienabled) {
                    return interaction.editReply({
                        embeds: [client.embeds.createWarning('AI Disabled', 'AI chat is not enabled on this server. Ask a moderator to enable it with `/ai toggle`.')],
                        ephemeral: true
                    });
                }

                const channels = await client.db.getAIChannels(interaction.guild.id);
                const isChannelEnabled = channels.includes(interaction.channel.id);

                if (!isChannelEnabled) {
                    return interaction.editReply({
                        embeds: [client.embeds.createWarning('Channel Not Enabled', 'AI chat is not enabled in this channel. Ask a moderator to add it with `/ai channels add`.')],
                        ephemeral: true
                    });
                }

                if (message) {
                    // Process AI message
                    const personality = AI_PERSONALITIES[settings.aipersonality || 'yuki'];
                    const response = await client.ai.generateResponse(message, {
                        userId: interaction.user.id,
                        channelId: interaction.channel.id,
                        personality: settings.aipersonality || 'yuki',
                        isSpecialUser: interaction.user.id === client.config.ownerId
                    });

                    const embed = client.embeds.createCustom(
                        `${personality.emoji} ${personality.name} Responds`,
                        response,
                        personality.color
                    ).setFooter({ text: `Triggered by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

                    await interaction.editReply({ embeds: [embed] });
                } else {
                    // Show status
                    const personality = AI_PERSONALITIES[settings.aipersonality || 'yuki'];
                    const embed = client.embeds.createInfo(
                        `${personality.emoji} AI Chat Active`,
                        `${personality.name} is ready to chat in this channel! Use \`${settings.aitriggersymbol || '!'}\` followed by your message.`
                    ).addFields(
                        { name: '🎯 Current Personality', value: `${personality.emoji} ${personality.name}`, inline: true },
                        { name: '🔧 Trigger Symbol', value: settings.aitriggersymbol || '!', inline: true },
                        { name: '💬 Example Usage', value: `\`${settings.aitriggersymbol || '!'}Hello there!\``, inline: false }
                    );

                    await interaction.editReply({ embeds: [embed] });
                }
            } catch (error) {
                client.logger.error('Error in ai-chat command:', error);
                await interaction.editReply({
                    embeds: [client.embeds.createError('Error', 'An error occurred while processing your request.')],
                    ephemeral: true
                });
            }
        }
    }
];

// Helper functions
async function handleToggle(interaction, client) {
    const enabled = interaction.options.getBoolean('enabled');
    const channel = interaction.options.getChannel('channel');

    await client.db.setAISetting(interaction.guild.id, 'aienabled', enabled ? 1 : 0);

    if (channel && enabled) {
        await client.db.addAIChannel(interaction.guild.id, channel.id);
    }

    const embed = client.embeds.createSuccess(
        '🤖 AI Chat Settings',
        `AI chat has been **${enabled ? 'enabled' : 'disabled'}**${channel ? ` in ${channel}` : ' server-wide'}.`
    );

    if (enabled) {
        const settings = await client.db.getAISettings(interaction.guild.id);
        const personality = AI_PERSONALITIES[settings.aipersonality || 'yuki'];

        embed.addFields(
            { name: '🎯 Current Personality', value: `${personality.emoji} ${personality.name}`, inline: true },
            { name: '🔧 Trigger Symbol', value: settings.aitriggersymbol || '!', inline: true },
            { name: '💡 Next Steps', value: channel ? 'AI is ready to chat!' : 'Use `/ai channels add` to enable in specific channels', inline: false }
        );
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handlePersonality(interaction, client) {
    const personalityType = interaction.options.getString('type');
    const personality = AI_PERSONALITIES[personalityType];

    await client.db.setAISetting(interaction.guild.id, 'aipersonality', personalityType);

    const embed = client.embeds.createCustom(
        `${personality.emoji} Personality Updated`,
        `${personality.greeting}`,
        personality.color
    ).addFields(
        { name: '✨ Personality Traits', value: personality.traits.join('\n• '), inline: false },
        { name: '📝 Description', value: personality.description, inline: false }
    );

    await interaction.editReply({ embeds: [embed] });
}

async function handleTrigger(interaction, client) {
    const symbol = interaction.options.getString('symbol');

    // Validate symbol
    if (symbol.length > 5) {
        return interaction.editReply({
            embeds: [client.embeds.createError('Invalid Symbol', 'Trigger symbol must be 5 characters or less.')],
            ephemeral: true
        });
    }

    await client.db.setAISetting(interaction.guild.id, 'aitriggersymbol', symbol);

    const embed = client.embeds.createSuccess(
        '🔧 Trigger Symbol Updated',
        `AI trigger symbol has been set to \`${symbol}\``
    ).addFields(
        { name: '💬 How to Use', value: `Type \`${symbol}your message\` and the AI will respond`, inline: false },
        { name: '📝 Example', value: `\`${symbol}Hello there!\``, inline: false }
    );

    await interaction.editReply({ embeds: [embed] });
}

async function handleChannels(interaction, client) {
    const action = interaction.options.getString('action');
    const channel = interaction.options.getChannel('channel');

    switch (action) {
        case 'add':
            if (!channel) {
                return interaction.editReply({
                    embeds: [client.embeds.createError('Missing Channel', 'Please specify a channel to add.')],
                    ephemeral: true
                });
            }

            // Check bot permissions
            if (!await client.permissions.botHasPermissions(channel, ['SendMessages', 'EmbedLinks'])) {
                return interaction.editReply({
                    embeds: [client.embeds.createError('Missing Permissions', 'I need Send Messages and Embed Links permissions in that channel.')],
                    ephemeral: true
                });
            }

            await client.db.addAIChannel(interaction.guild.id, channel.id);

            const embed = client.embeds.createSuccess(
                '✅ Channel Added',
                `${channel} has been added to AI-enabled channels.`
            );

            await interaction.editReply({ embeds: [embed] });
            break;

        case 'remove':
            if (!channel) {
                return interaction.editReply({
                    embeds: [client.embeds.createError('Missing Channel', 'Please specify a channel to remove.')],
                    ephemeral: true
                });
            }

            await client.db.removeAIChannel(interaction.guild.id, channel.id);

            const removeEmbed = client.embeds.createSuccess(
                '🗑️ Channel Removed',
                `${channel} has been removed from AI-enabled channels.`
            );

            await interaction.editReply({ embeds: [removeEmbed] });
            break;

        case 'list':
            const channels = await client.db.getAIChannels(interaction.guild.id);

            if (channels.length === 0) {
                return interaction.editReply({
                    embeds: [client.embeds.createInfo('📋 AI Channels', 'No channels are currently AI-enabled.')]
                });
            }

            const channelList = channels.map(id => `<#${id}>`).join('\n');
            const listEmbed = client.embeds.createInfo(
                '📋 AI-Enabled Channels',
                `AI is active in ${channels.length} channel(s):`
            ).setDescription(channelList);

            await interaction.editReply({ embeds: [listEmbed] });
            break;

        case 'clear':
            await client.db.clearAIChannels(interaction.guild.id);

            const clearEmbed = client.embeds.createSuccess(
                '🗑️ Channels Cleared',
                'All AI-enabled channels have been removed.'
            );

            await interaction.editReply({ embeds: [clearEmbed] });
            break;
    }
}

async function handleStatus(interaction, client) {
    const settings = await client.db.getAISettings(interaction.guild.id);
    const channels = await client.db.getAIChannels(interaction.guild.id);
    const channelHistory = await client.db.getChannelHistory(interaction.channel.id, 50);
    const userMemory = await client.db.getUserMemory(interaction.user.id);

    const personality = AI_PERSONALITIES[settings.aipersonality || 'yuki'];
    const activeUsers = await client.db.getActiveAIUsers(interaction.guild.id);
    const activeGames = await client.db.getActiveGames(interaction.guild.id);

    const embed = client.embeds.createCustom(
        `${personality.emoji} ${personality.name}'s Status & Features`,
        personality.greeting,
        personality.color
    ).addFields(
        { name: '🔌 System Status', value: settings.aienabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: '📺 Active Channels', value: channels.length > 0 ? `${channels.length} channels` : 'None', inline: true },
        { name: '🔧 Trigger Symbol', value: settings.aitriggersymbol || '!', inline: true },
        { name: '💭 This Channel Memory', value: `${channelHistory.length} messages remembered`, inline: true },
        { name: '👤 Your Personal Memory', value: userMemory ? `${Math.floor(userMemory.length / 2)} exchanges` : 'No memory', inline: true },
        { name: '🎮 Active Games', value: `${activeGames.length} games in progress`, inline: true },
        { name: '✨ Personality Features', value: personality.traits.join('\n• '), inline: false }
    );

    if (channels.length > 0) {
        const channelList = channels.map(id => `<#${id}>`).join(', ');
        embed.addFields({ name: '📋 Enabled Channels', value: channelList.length > 1000 ? `${channelList.substring(0, 1000)}...` : channelList, inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleClear(interaction, client) {
    const scope = interaction.options.getString('scope');
    const userId = interaction.user.id;

    let clearedData = '';

    switch (scope) {
        case 'user':
            await client.db.clearUserMemory(userId);
            await client.db.clearUserGames(userId);
            clearedData = 'Your personal conversation history and active games have been cleared! 🧹';
            break;

        case 'channel':
            await client.db.clearChannelHistory(interaction.channel.id);
            clearedData = 'This channel\'s conversation history has been cleared! Fresh start! 🧹';
            break;

        case 'server':
            if (!await client.permissions.isAdmin(interaction.member)) {
                return interaction.editReply({
                    embeds: [client.embeds.createError('Permission Denied', 'Only administrators can clear server-wide AI memory.')],
                    ephemeral: true
                });
            }
            await client.db.clearServerAIMemory(interaction.guild.id);
            clearedData = 'All server AI memory has been cleared! Complete fresh start! 🧹';
            break;
    }

    const embed = client.embeds.createSuccess('🧹 Memory Cleared', clearedData);
    await interaction.editReply({ embeds: [embed] });
}

async function handleGame(interaction, client) {
    const gameType = interaction.options.getString('type');
    const game = CONVERSATION_GAMES[gameType];

    if (!game) {
        return interaction.editReply({
            embeds: [client.embeds.createError('Game Not Found', 'Could not find that game!')],
            ephemeral: true
        });
    }

    const settings = await client.db.getAISettings(interaction.guild.id);
    const personality = settings.aipersonality || 'yuki';
    const aiPersonality = AI_PERSONALITIES[personality];

    let gameContent = '';
    let gameState = {
        type: gameType,
        step: 1,
        player: interaction.user.id
    };

    switch (gameType) {
        case '20questions':
            const randomItem = game.items[Math.floor(Math.random() * game.items.length)];
            gameState.answer = randomItem;
            gameState.guesses = 0;
            gameContent = `${game.intro[personality]}I've chosen something... Ask your first yes/no question! 🎯`;
            break;

        case 'storytelling':
            const randomStarter = game.starters[Math.floor(Math.random() * game.starters.length)];
            gameState.story = randomStarter;
            gameContent = `${game.intro[personality]}\n\n"${randomStarter}"\n\nYour turn! Continue the story... 📚`;
            break;

        case 'wouldyourather':
            const randomQuestion = game.questions[Math.floor(Math.random() * game.questions.length)];
            gameState.question = randomQuestion;
            gameContent = `${game.intro[personality]}${randomQuestion} 🤔`;
            break;

        case 'riddles':
            const randomRiddle = game.riddles[Math.floor(Math.random() * game.riddles.length)];
            gameState.riddle = randomRiddle;
            gameContent = `${game.intro[personality]}\n\n"${randomRiddle.question}" 🧩`;
            break;
    }

    // Store game state
    await client.db.setActiveGame(interaction.user.id, gameState);

    const embed = client.embeds.createCustom(
        `🎮 ${game.name} Started with ${aiPersonality.name}!`,
        gameContent,
        aiPersonality.color
    ).setFooter({ 
        text: `Remember to use your AI trigger symbol (${settings.aitriggersymbol || '!'}) so ${aiPersonality.name} can respond to your moves!`,
        iconURL: interaction.user.displayAvatarURL()
    });

    await interaction.editReply({ embeds: [embed] });
}

async function handleReset(interaction, client) {
    // Confirm with user first
    const confirmEmbed = client.embeds.createWarning(
        '⚠️ Reset AI Settings',
        'This will reset ALL AI settings to defaults:\n\n• Personality: Yuki (shy & caring)\n• Trigger: !\n• All channels cleared\n• All memories cleared\n• All games ended\n\nAre you sure?'
    );

    await interaction.editReply({ 
        embeds: [confirmEmbed],
        components: [{
            type: 1,
            components: [{
                type: 2,
                style: 4,
                label: 'Yes, Reset Everything',
                custom_id: 'ai_reset_confirm'
            }, {
                type: 2,
                style: 2,
                label: 'Cancel',
                custom_id: 'ai_reset_cancel'
            }]
        }]
    });

    // Handle button response (this would be in interactionCreate.js)
    // For now, we'll just show the embed
}

module.exports = {
    commands,
    AI_PERSONALITIES,
    CONVERSATION_GAMES
};
