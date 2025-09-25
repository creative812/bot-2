const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require('discord.js');

/**
 * Role Management – Auto-Roles & Self-Roles with Dropdown
 * 
 * Improvements:
 * - Role hierarchy checks (cannot manage higher/equal roles)
 * - Null/length safety
 * - Improved error messages
 */

const commands = [
  {
    name: 'roles',
    description: 'Manage auto-roles and self-assignable roles',
    permissions: 'admin',
    data: new SlashCommandBuilder()
      .setName('roles')
      .setDescription('Manage auto-roles and self-assignable roles')
      .addSubcommand(sub =>
        sub
          .setName('auto-role')
          .setDescription('Configure auto-role for new members')
          .addStringOption(opt =>
            opt.setName('action')
               .setDescription('Add, remove, view, or clear auto-roles')
               .setRequired(true)
               .addChoices(
                 { name: 'Add Role',    value: 'add' },
                 { name: 'Remove Role', value: 'remove' },
                 { name: 'View Roles',  value: 'view' },
                 { name: 'Clear All',   value: 'clear' }
               ))
          .addRoleOption(opt =>
            opt.setName('role')
               .setDescription('Role to add/remove')
               .setRequired(false)))
      .addSubcommand(sub =>
        sub
          .setName('self-role')
          .setDescription('Manage self-assignable roles')
          .addStringOption(opt =>
            opt.setName('action')
               .setDescription('Add, remove, list, clear, or menu')
               .setRequired(true)
               .addChoices(
                 { name: 'Add Role',    value: 'add' },
                 { name: 'Remove Role', value: 'remove' },
                 { name: 'List Roles',  value: 'list' },
                 { name: 'Clear All',   value: 'clear' },
                 { name: 'Post Menu',   value: 'menu' }
               ))
          .addRoleOption(opt =>
            opt.setName('role')
               .setDescription('Role to add/remove')
               .setRequired(false))),
    async execute(interaction) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('Permission Denied')
              .setDescription('You need the **Manage Roles** permission.')
          ],
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });
      const sub = interaction.options.getSubcommand();
      const action = interaction.options.getString('action');
      const role = interaction.options.getRole('role');
      const guild = interaction.guild;
      const botMember = guild.members.me;
      const member = interaction.member;

      try {
        if (sub === 'auto-role') {
          await handleAutoRole(interaction, action, role);
        } else {
          await handleSelfRole(interaction, action, role, guild, member, botMember);
        }
      } catch (error) {
        console.error('Roles command error:', error);
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('Error')
              .setDescription('An unexpected error occurred.')
          ]
        });
      }
    }
  }
];

// Helpers

async function handleAutoRole(interaction, action, role) {
  const guildId = interaction.guild.id;

  if (action === 'view') {
    const roles = await interaction.client.db.getAutoRoles(guildId);
    const desc = roles.length
      ? roles.map(r => `<@&${r.roleid}>`).join('\n')
      : 'No auto-roles configured.';
    return interaction.editReply({ embeds: [interaction.client.embeds.createInfo('Auto-Roles', desc)] });
  }

  if (action === 'clear') {
    await interaction.client.db.clearAutoRoles(guildId);
    return interaction.editReply({ embeds: [interaction.client.embeds.createSuccess('Cleared', 'All auto-roles removed.')] });
  }

  // add/remove require role
  if (!role) {
    return interaction.editReply({ embeds: [interaction.client.embeds.createError('Missing Role', 'Please specify a role.')] });
  }

  if (action === 'add') {
    await interaction.client.db.addAutoRole(guildId, role.id);
    return interaction.editReply({ embeds: [interaction.client.embeds.createSuccess('Auto-Role Added', `${role} will be assigned to new members.`)] });
  }

  if (action === 'remove') {
    await interaction.client.db.removeAutoRole(guildId, role.id);
    return interaction.editReply({ embeds: [interaction.client.embeds.createSuccess('Auto-Role Removed', `${role} will no longer be assigned.`)] });
  }
}

async function handleSelfRole(interaction, action, role, guild, member, botMember) {
  const guildId = guild.id;
  const db = interaction.client.db;

  if (action === 'list') {
    const roles = await db.getSelfRoles(guildId);
    const desc = roles.length
      ? roles.map(r => `<@&${r.roleid}>`).join('\n')
      : 'No self-assignable roles.';
    return interaction.editReply({ embeds: [interaction.client.embeds.createInfo('Self-Roles', desc)] });
  }

  if (action === 'clear') {
    await db.clearSelfRoles(guildId);
    return interaction.editReply({ embeds: [interaction.client.embeds.createSuccess('Cleared', 'All self-roles removed.')] });
  }

  if (action === 'menu') {
    const roles = await db.getSelfRoles(guildId);
    if (!roles.length) {
      return interaction.editReply({ embeds: [interaction.client.embeds.createInfo('No Roles', 'There are no self-assignable roles.')] });
    }
    const options = roles.map(r => {
      const roleObj = guild.roles.cache.get(r.roleid);
      return {
        label: roleObj?.name ?? 'Unknown Role',
        value: r.roleid
      };
    });
    const menu = new StringSelectMenuBuilder()
      .setCustomId('self_role_select')
      .setPlaceholder('Select roles to toggle')
      .setMinValues(1)
      .setMaxValues(options.length)
      .addOptions(options);
    const row = new ActionRowBuilder().addComponents(menu);
    const embed = new EmbedBuilder()
      .setTitle('Self-Assignable Roles')
      .setDescription('Select roles to add or remove:')
      .setColor('#00A2E8');
    return interaction.editReply({ embeds: [embed], components: [row] });
  }

  // add/remove require role
  if (!role) {
    return interaction.editReply({ embeds: [interaction.client.embeds.createError('Missing Role', 'Please specify a role.')] });
  }

  // Hierarchy checks
  if (role.position >= member.roles.highest.position) {
    return interaction.editReply({ embeds: [interaction.client.embeds.createError('Hierarchy Error', 'You cannot manage a role equal or higher than your highest role.')] });
  }
  if (role.position >= botMember.roles.highest.position) {
    return interaction.editReply({ embeds: [interaction.client.embeds.createError('Hierarchy Error', 'I cannot manage a role equal or higher than my highest role.')] });
  }

  if (action === 'add') {
    await db.addSelfRole(guildId, role.id);
    return interaction.editReply({ embeds: [interaction.client.embeds.createSuccess('Self-Role Added', `${role} is now self-assignable.`)] });
  }

  if (action === 'remove') {
    await db.removeSelfRole(guildId, role.id);
    return interaction.editReply({ embeds: [interaction.client.embeds.createSuccess('Self-Role Removed', `${role} is no longer self-assignable.`)] });
  }
}

module.exports = { commands };
