const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

class EmbedManager {

  /**
   * Creates a success embed
   * @param {string} title
   * @param {string} description
   * @returns {EmbedBuilder}
   */
  static createSuccessEmbed(title, description) {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(config.successColor || '#00FF00')
      .setTimestamp();
  }

  /**
   * Creates an error embed
   * @param {string} title
   * @param {string} description
   * @returns {EmbedBuilder}
   */
  static createErrorEmbed(title, description) {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(config.errorColor || '#FF0000')
      .setTimestamp();
  }

  /**
   * Creates a warning embed
   * @param {string} title
   * @param {string} description
   * @returns {EmbedBuilder}
   */
  static createWarningEmbed(title, description) {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(config.warningColor || '#FFA500')
      .setTimestamp();
  }

  /**
   * Creates a generic info embed
   * @param {string} title
   * @param {string} description
   * @returns {EmbedBuilder}
   */
  static createInfoEmbed(title, description) {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(config.embedColor || '#7289DA')
      .setTimestamp();
  }

  /**
   * Creates a user info embed
   * @param {GuildMember} member
   * @param {Array} warnings
   * @returns {EmbedBuilder}
   */
  static createUserInfoEmbed(member, warnings = []) {
    const user = member.user;
    return new EmbedBuilder()
      .setTitle(`User Information: ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User ID', value: user.id, inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
        { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
        { name: 'Number of Warnings', value: warnings.length.toString(), inline: true }
      )
      .setColor(config.embedColor)
      .setTimestamp();
  }

  /**
   * Creates a simple welcome embed
   * @param {GuildMember} member
   * @param {string|null} customMessage
   * @returns {EmbedBuilder}
   */
  static createWelcomeEmbed(member, customMessage = null) {
    const message = customMessage || `Welcome to **${member.guild.name}**, ${member}!`;
    return new EmbedBuilder()
      .setTitle('Welcome!')
      .setDescription(message)
      .setColor(config.successColor)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();
  }

  /**
   * Creates a simple leave embed
   * @param {User} user
   * @param {Guild} guild
   * @param {string|null} customMessage
   * @returns {EmbedBuilder}
   */
  static createLeaveEmbed(user, guild, customMessage = null) {
    const message = customMessage || `**${user.tag}** has left the server.`;
    return new EmbedBuilder()
      .setTitle('Goodbye!')
      .setDescription(message)
      .setColor(config.errorColor)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();
  }
}

module.exports = EmbedManager;