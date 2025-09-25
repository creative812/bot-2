const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

/**
 * Manage-Commands – Enable or disable bot commands at runtime
 *
 * Features:
 * - Disable a command with optional reason
 * - Enable a previously disabled command
 * - List all disabled commands
 * - Check status of a specific command
 */

const commands = [
  {
    name: 'manage-commands',
    description: 'Enable or disable specific bot commands',
    permissions: 'admin',
    data: new SlashCommandBuilder()
      .setName('manage-commands')
      .setDescription('Enable or disable specific bot commands')
      .addSubcommand(sub =>
        sub.setName('disable')
           .setDescription('Disable a command')
           .addStringOption(opt =>
             opt.setName('command')
                .setDescription('Command name to disable')
                .setRequired(true)
                .setAutocomplete(true))
           .addStringOption(opt =>
             opt.setName('reason')
                .setDescription('Reason for disabling')
                .setRequired(false)))
      .addSubcommand(sub =>
        sub.setName('enable')
           .setDescription('Enable a previously disabled command')
           .addStringOption(opt =>
             opt.setName('command')
                .setDescription('Command name to enable')
                .setRequired(true)
                .setAutocomplete(true)))
      .addSubcommand(sub =>
        sub.setName('list')
           .setDescription('List all disabled commands'))
      .addSubcommand(sub =>
        sub.setName('status')
           .setDescription('Check if a command is enabled or disabled')
           .addStringOption(opt =>
             opt.setName('command')
                .setDescription('Command name to check')
                .setRequired(true)
                .setAutocomplete(true))),
    async execute(interaction, client) {
      if (!await client.permissions.isAdmin(interaction.member)) {
        return interaction.reply({
          embeds: [client.embeds.createError('Permission Denied', 'Administrator only.')],
          ephemeral: true
        });
      }
      await interaction.deferReply({ ephemeral: true });
      const sub = interaction.options.getSubcommand();
      try {
        switch (sub) {
          case 'disable':  await handleDisable(interaction, client); break;
          case 'enable':   await handleEnable(interaction, client); break;
          case 'list':     await handleList(interaction, client); break;
          case 'status':   await handleStatus(interaction, client); break;
        }
      } catch (error) {
        client.logger.error('Manage-Commands error:', error);
        await interaction.editReply({
          embeds: [client.embeds.createError('Error', 'Operation failed.')]
        });
      }
    },
    async autocomplete(interaction) {
      const sub = interaction.options.getSubcommand();
      const focused = interaction.options.getFocused(true);
      if (focused.name !== 'command') return;
      let choices = [];
      if (sub === 'disable' || sub === 'status') {
        const protectedCommands = ['manage-commands','help','settings'];
        choices = Array.from(interaction.client.commands.keys())
          .filter(cmd => !protectedCommands.includes(cmd))
          .filter(cmd => cmd.includes(focused.value))
          .slice(0,25);
      } else {
        const disabled = await interaction.client.db.getDisabledCommands(interaction.guild.id);
        choices = disabled.map(d => d.command).filter(cmd => cmd.includes(focused.value)).slice(0,25);
      }
      await interaction.respond(
        choices.map(c => ({ name: c, value: c }))
      );
    }
  }
];

// Handlers

async function handleDisable(interaction, client) {
  const name = interaction.options.getString('command');
  const reason = interaction.options.getString('reason') ?? 'No reason provided';
  const cmd = client.commands.get(name);
  if (!cmd) {
    return interaction.editReply({
      embeds: [client.embeds.createError('Not Found', `\`${name}\` does not exist.`)]
    });
  }
  if (await client.db.getDisabledCommand(interaction.guild.id, name)) {
    return interaction.editReply({
      embeds: [client.embeds.createError('Already Disabled', `\`${name}\` is already disabled.`)]
    });
  }
  await client.db.disableCommand(interaction.guild.id, name, interaction.user.id, reason);
  client.disabledCommands = client.disabledCommands || new Set();
  client.disabledCommands.add(name);
  await interaction.editReply({
    embeds: [client.embeds.createSuccess('Disabled', `\`${name}\` has been disabled.`)]
  });
  await client.db.addModLog(
    interaction.guild.id,
    'Command Disabled',
    name,
    interaction.user.id,
    reason
  );
}

async function handleEnable(interaction, client) {
  const name = interaction.options.getString('command');
  const record = await client.db.getDisabledCommand(interaction.guild.id, name);
  if (!record) {
    return interaction.editReply({
      embeds: [client.embeds.createError('Not Disabled', `\`${name}\` is not disabled.`)]
    });
  }
  await client.db.enableCommand(interaction.guild.id, name);
  client.disabledCommands.delete(name);
  await interaction.editReply({
    embeds: [client.embeds.createSuccess('Enabled', `\`${name}\` has been enabled.`)]
  });
  await client.db.addModLog(
    interaction.guild.id,
    'Command Enabled',
    name,
    interaction.user.id,
    'Re-enabled'
  );
}

async function handleList(interaction, client) {
  const list = await client.db.getDisabledCommands(interaction.guild.id);
  if (!list.length) {
    return interaction.editReply({
      embeds: [client.embeds.createInfo('None', 'No commands are disabled.')]
    });
  }
  const desc = list.map((d,i) => `**${i+1}.** \`${d.command}\` – ${d.reason}`).join('\n');
  await interaction.editReply({
    embeds: [client.embeds.createInfo('Disabled Commands', desc)]
  });
}

async function handleStatus(interaction, client) {
  const name = interaction.options.getString('command');
  const cmd = client.commands.get(name);
  if (!cmd) {
    return interaction.editReply({
      embeds: [client.embeds.createError('Not Found', `\`${name}\` does not exist.`)]
    });
  }
  const disabled = await client.db.getDisabledCommand(interaction.guild.id, name);
  if (disabled) {
    await interaction.editReply({
      embeds: [client.embeds.createError('Disabled', `\`${name}\` is disabled.\nReason: ${disabled.reason}`)]
    });
  } else {
    await interaction.editReply({
      embeds: [client.embeds.createSuccess('Enabled', `\`${name}\` is enabled.`)]
    });
  }
}

module.exports = { commands };
