const config = require('../config.json');
const { PermissionsBitField } = require('discord.js');

class PermissionManager {
  /**
   * Checks if the member has a specific Discord permission
   * @param {GuildMember} member
   * @param {string | bigint | (string|bigint)[]} perms
   * @returns {boolean}
   */
  static hasDiscordPermission(member, perms) {
    if (!member || !member.permissions) return false;
    if (!Array.isArray(perms)) perms = [perms];
    try {
      return member.permissions.has(perms, true);
    } catch {
      return false;
    }
  }

  /**
   * Checks if member has a role by name (case-insensitive)
   * @param {GuildMember} member
   * @param {string} roleName
   * @returns {boolean}
   */
  static hasRoleByName(member, roleName) {
    if (!member) return false;
    return member.roles.cache.some(
      role => role.name.toLowerCase() === roleName.toLowerCase()
    );
  }

  /**
   * Determines permission level string by checking roles and Discord permissions
   * Levels: owner > admin > moderator > helper > user
   * @param {GuildMember} member
   * @returns {string}
   */
  static getPermissionLevel(member) {
    if (!member) return 'user';

    const ownerId = config.ownerId?.toString();
    if (ownerId && member.id === ownerId) return 'owner';

    // Helper to check role/permission for a category (admin/moderator/helper)
    const checkRolePerms = (key) => {
      const perms = config.permissions?.[key];
      if (!Array.isArray(perms) || perms.length === 0) return false;

      return perms.some(perm => {
        // If config has a valid Discord permission flag string, match it
        if (PermissionsBitField.Flags[perm]) {
          return this.hasDiscordPermission(member, PermissionsBitField.Flags[perm]);
        }
        // Otherwise assume it's a role name
        return this.hasRoleByName(member, perm);
      });
    };

    if (checkRolePerms('admin')) return 'admin';
    if (checkRolePerms('moderator')) return 'moderator';
    if (checkRolePerms('helper')) return 'helper';

    return 'user';
  }

  /**
   * Helper to check if level matches or exceeds a threshold
   * @param {GuildMember} member
   * @param {string} threshold One of 'user', 'helper', 'moderator', 'admin', 'owner'
   * @returns {boolean}
   */
  static hasAtLeastPermission(member, threshold) {
    const order = ['user', 'helper', 'moderator', 'admin', 'owner'];
    const memberLevel = this.getPermissionLevel(member);
    return order.indexOf(memberLevel) >= order.indexOf(threshold);
  }

  static isOwner(member) {
    return this.getPermissionLevel(member) === 'owner';
  }

  static isAdmin(member) {
    return this.hasAtLeastPermission(member, 'admin');
  }

  static isModerator(member) {
    return this.hasAtLeastPermission(member, 'moderator');
  }

  static isHelper(member) {
    return this.hasAtLeastPermission(member, 'helper');
  }
}

module.exports = PermissionManager;
