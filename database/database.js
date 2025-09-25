const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const Logger = require('./utils/logger');
const config = require('./config.json');

// Create data directory if it doesn't exist
const dataDir = path.dirname(config.database.path);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(config.database.path, { verbose: Logger.info });

// Helper function to convert snake_case to camelCase
const toCamelCase = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    const camelObj = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        camelObj[camelKey] = value;
    }
    return camelObj;
};

// Helper function to convert camelCase to snake_case for database operations
const toSnakeCase = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    const snakeObj = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        snakeObj[snakeKey] = value;
    }
    return snakeObj;
};

// Initialize tables
const initTables = () => {
    try {
        // Guild settings table - includes AI settings
        db.exec(`
            CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id TEXT PRIMARY KEY,
                prefix TEXT DEFAULT '?',
                log_channel_id TEXT,
                welcome_channel_id TEXT,
                leave_channel_id TEXT,
                mute_role_id TEXT,
                auto_role_id TEXT,
                welcome_message TEXT,
                leave_message TEXT,
                ai_enabled INTEGER DEFAULT 0,
                ai_channel_id TEXT,
                ai_trigger_symbol TEXT DEFAULT '!',
                ai_personality TEXT DEFAULT 'cheerful',
                ai_channels TEXT DEFAULT '[]',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Disabled commands table
        db.exec(`
            CREATE TABLE IF NOT EXISTS disabled_commands (
                guild_id TEXT NOT NULL,
                command_name TEXT NOT NULL,
                disabled_by TEXT NOT NULL,
                reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (guild_id, command_name)
            )
        `);

        // Channel messages for AI memory
        db.exec(`
            CREATE TABLE IF NOT EXISTS channel_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                message_content TEXT NOT NULL,
                is_ai_response INTEGER DEFAULT 0,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Users table for leveling system
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                exp INTEGER DEFAULT 0,
                lvl INTEGER DEFAULT 0,
                messages INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (guild_id, user_id)
            )
        `);

        // Level roles table
        db.exec(`
            CREATE TABLE IF NOT EXISTS roles (
                guild_id TEXT NOT NULL,
                lvl INTEGER NOT NULL,
                role_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (guild_id, lvl)
            )
        `);

        // Warnings table
        db.exec(`
            CREATE TABLE IF NOT EXISTS warnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                moderator_id TEXT NOT NULL,
                reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME
            )
        `);

        // Mutes table
        db.exec(`
            CREATE TABLE IF NOT EXISTS mutes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                moderator_id TEXT NOT NULL,
                reason TEXT,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Giveaways table
        db.exec(`
            CREATE TABLE IF NOT EXISTS giveaways (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                message_id TEXT UNIQUE,
                host_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                winner_count INTEGER DEFAULT 1,
                requirements TEXT,
                ends_at DATETIME NOT NULL,
                ended INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Giveaway entries table
        db.exec(`
            CREATE TABLE IF NOT EXISTS giveaway_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                giveaway_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (giveaway_id) REFERENCES giveaways(id),
                UNIQUE (giveaway_id, user_id)
            )
        `);

        // Ticket settings table
        db.exec(`
            CREATE TABLE IF NOT EXISTS ticket_settings (
                guild_id TEXT PRIMARY KEY,
                category_id TEXT,
                staff_role_ids TEXT,
                log_channel_id TEXT,
                next_ticket_number INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tickets table
        db.exec(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                channel_id TEXT UNIQUE,
                ticket_number INTEGER NOT NULL,
                reason TEXT,
                status TEXT DEFAULT 'open',
                claimed_by TEXT,
                closed_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                closed_at DATETIME
            )
        `);

        // Moderation logs table
        db.exec(`
            CREATE TABLE IF NOT EXISTS mod_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                target_user_id TEXT NOT NULL,
                moderator_id TEXT NOT NULL,
                reason TEXT,
                duration TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        Logger.info('Database tables initialized successfully');
    } catch (error) {
        Logger.error('Error initializing database tables:', error);
        throw error;
    }
};

initTables();

// Prepared statements for all database operations
const statements = {
    // Guild settings
    getGuildSettings: db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?'),
    setGuildSettings: db.prepare(`
        INSERT OR REPLACE INTO guild_settings 
        (guild_id, prefix, log_channel_id, welcome_channel_id, leave_channel_id, mute_role_id, auto_role_id, welcome_message, leave_message, ai_enabled, ai_channel_id, ai_trigger_symbol, ai_personality, ai_channels, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `),

    // Command management
    disableCommand: db.prepare(`
        INSERT OR REPLACE INTO disabled_commands 
        (guild_id, command_name, disabled_by, reason) 
        VALUES (?, ?, ?, ?)
    `),
    enableCommand: db.prepare(`
        DELETE FROM disabled_commands 
        WHERE guild_id = ? AND command_name = ?
    `),
    getDisabledCommand: db.prepare(`
        SELECT * FROM disabled_commands 
        WHERE guild_id = ? AND command_name = ?
    `),
    getDisabledCommands: db.prepare(`
        SELECT * FROM disabled_commands 
        WHERE guild_id = ?
    `),

    // AI channel messages
    addChannelMessage: db.prepare(`
        INSERT INTO channel_messages 
        (channel_id, user_id, username, message_content, is_ai_response, timestamp) 
        VALUES (?, ?, ?, ?, ?, ?)
    `),
    getChannelHistory: db.prepare(`
        SELECT * FROM channel_messages 
        WHERE channel_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
    `),
    cleanOldChannelMessages: db.prepare(`
        DELETE FROM channel_messages 
        WHERE channel_id = ? AND id NOT IN (
            SELECT id FROM channel_messages 
            WHERE channel_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 100
        )
    `),

    // Users and leveling
    getUser: db.prepare('SELECT * FROM users WHERE guild_id = ? AND user_id = ?'),
    createUser: db.prepare(`
        INSERT OR IGNORE INTO users 
        (guild_id, user_id, exp, lvl, messages) 
        VALUES (?, ?, 0, 0, 0)
    `),
    updateUser: db.prepare(`
        UPDATE users 
        SET exp = ?, lvl = ?, messages = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE guild_id = ? AND user_id = ?
    `),
    getLeaderboard: db.prepare(`
        SELECT * FROM users 
        WHERE guild_id = ? 
        ORDER BY lvl DESC, exp DESC 
        LIMIT ?
    `),
    getUserRank: db.prepare(`
        SELECT COUNT(*) + 1 as rank FROM users 
        WHERE guild_id = ? AND (lvl > ? OR (lvl = ? AND exp > ?))
    `),

    // Level roles
    getLevelRole: db.prepare('SELECT * FROM roles WHERE guild_id = ? AND lvl = ?'),
    addLevelRole: db.prepare(`
        INSERT OR REPLACE INTO roles 
        (guild_id, lvl, role_id) 
        VALUES (?, ?, ?)
    `),
    removeLevelRole: db.prepare('DELETE FROM roles WHERE guild_id = ? AND lvl = ?'),
    getAllLevelRoles: db.prepare('SELECT * FROM roles WHERE guild_id = ? ORDER BY lvl ASC'),

    // Warnings
    addWarning: db.prepare(`
        INSERT INTO warnings 
        (guild_id, user_id, moderator_id, reason, expires_at) 
        VALUES (?, ?, ?, ?, ?)
    `),
    getUserWarnings: db.prepare(`
        SELECT * FROM warnings 
        WHERE guild_id = ? AND user_id = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ORDER BY created_at DESC
    `),
    removeWarning: db.prepare('DELETE FROM warnings WHERE id = ?'),
    clearUserWarnings: db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?'),

    // Mutes
    addMute: db.prepare(`
        INSERT INTO mutes 
        (guild_id, user_id, moderator_id, reason, expires_at) 
        VALUES (?, ?, ?, ?, ?)
    `),
    getMute: db.prepare(`
        SELECT * FROM mutes 
        WHERE guild_id = ? AND user_id = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ORDER BY created_at DESC LIMIT 1
    `),
    removeMute: db.prepare('DELETE FROM mutes WHERE guild_id = ? AND user_id = ?'),

    // Tickets
    getTicketSettings: db.prepare('SELECT * FROM ticket_settings WHERE guild_id = ?'),
    setTicketSettings: db.prepare(`
        INSERT OR REPLACE INTO ticket_settings 
        (guild_id, category_id, staff_role_ids, log_channel_id, updated_at) 
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `),
    getNextTicketNumber: db.prepare(`
        UPDATE ticket_settings 
        SET next_ticket_number = next_ticket_number + 1 
        WHERE guild_id = ? 
        RETURNING next_ticket_number - 1 as ticket_number
    `),
    createTicket: db.prepare(`
        INSERT INTO tickets 
        (guild_id, user_id, channel_id, ticket_number, reason) 
        VALUES (?, ?, ?, ?, ?)
    `),
    getTicketByChannel: db.prepare('SELECT * FROM tickets WHERE channel_id = ?'),
    getUserTicket: db.prepare(`
        SELECT * FROM tickets 
        WHERE guild_id = ? AND user_id = ? AND status = 'open'
    `),
    getOpenTickets: db.prepare('SELECT * FROM tickets WHERE guild_id = ? AND status = "open"'),
    claimTicket: db.prepare(`
        UPDATE tickets 
        SET claimed_by = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `),
    closeTicket: db.prepare(`
        UPDATE tickets 
        SET status = 'closed', closed_by = ?, closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `),

    // Giveaways
    createGiveaway: db.prepare(`
        INSERT INTO giveaways 
        (guild_id, channel_id, message_id, host_id, title, description, winner_count, requirements, ends_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    getGiveaway: db.prepare('SELECT * FROM giveaways WHERE message_id = ?'),
    getActiveGiveaways: db.prepare('SELECT * FROM giveaways WHERE ended = 0 AND ends_at <= ?'),
    endGiveaway: db.prepare('UPDATE giveaways SET ended = 1 WHERE id = ?'),
    addGiveawayEntry: db.prepare(`
        INSERT OR IGNORE INTO giveaway_entries 
        (giveaway_id, user_id) 
        VALUES (?, ?)
    `),
    getGiveawayEntries: db.prepare('SELECT * FROM giveaway_entries WHERE giveaway_id = ?'),
    removeGiveawayEntry: db.prepare('DELETE FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?'),

    // Moderation logs
    addModLog: db.prepare(`
        INSERT INTO mod_logs 
        (guild_id, action_type, target_user_id, moderator_id, reason, duration) 
        VALUES (?, ?, ?, ?, ?, ?)
    `),
    getModLogs: db.prepare(`
        SELECT * FROM mod_logs 
        WHERE guild_id = ? AND target_user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
    `),
};

// Database interface methods with property name normalization
class DatabaseManager {
    static get db() {
        return db;
    }

    // Guild settings methods - NOW RETURNS CAMELCASE PROPERTIES
    static getGuildSettings(guildId) {
        const result = statements.getGuildSettings.get(guildId);
        if (!result) return null;

        // Convert snake_case to camelCase and parse JSON fields
        const settings = toCamelCase(result);
        if (settings.aiChannels) {
            try {
                settings.aiChannels = JSON.parse(settings.aiChannels);
            } catch {
                settings.aiChannels = [];
            }
        }
        return settings;
    }

    static setGuildSettings(guildId, settings) {
        // Convert camelCase to snake_case for database storage
        const dbSettings = toSnakeCase(settings);
        return statements.setGuildSettings.run(
            guildId, 
            dbSettings.prefix || '?', 
            dbSettings.log_channel_id, 
            dbSettings.welcome_channel_id,
            dbSettings.leave_channel_id, 
            dbSettings.mute_role_id, 
            dbSettings.auto_role_id,
            dbSettings.welcome_message, 
            dbSettings.leave_message, 
            dbSettings.ai_enabled || 0,
            dbSettings.ai_channel_id, 
            dbSettings.ai_trigger_symbol || '!', 
            dbSettings.ai_personality || 'cheerful',
            JSON.stringify(dbSettings.ai_channels || [])
        );
    }

    // Command management methods
    static disableCommand(guildId, commandName, disabledBy, reason) {
        const result = statements.disableCommand.run(guildId, commandName, disabledBy, reason);
        return toCamelCase(result);
    }

    static enableCommand(guildId, commandName) {
        return statements.enableCommand.run(guildId, commandName);
    }

    static getDisabledCommand(guildId, commandName) {
        const result = statements.getDisabledCommand.get(guildId, commandName);
        return result ? toCamelCase(result) : null;
    }

    static getDisabledCommands(guildId) {
        const results = statements.getDisabledCommands.all(guildId);
        return results.map(result => toCamelCase(result));
    }

    // AI message methods
    static addChannelMessage(channelId, userId, username, messageContent, isAiResponse = 0) {
        return statements.addChannelMessage.run(channelId, userId, username, messageContent, isAiResponse, new Date().toISOString());
    }

    static getChannelHistory(channelId, limit = 20) {
        const results = statements.getChannelHistory.all(channelId, limit);
        return results.map(result => toCamelCase(result));
    }

    static cleanOldChannelMessages(channelId) {
        return statements.cleanOldChannelMessages.run(channelId, channelId);
    }

    // User and leveling methods
    static getUser(guildId, userId) {
        let user = statements.getUser.get(guildId, userId);
        if (!user) {
            statements.createUser.run(guildId, userId);
            user = statements.getUser.get(guildId, userId);
        }
        return user ? toCamelCase(user) : null;
    }

    static updateUser(guildId, userId, exp, level, messages) {
        return statements.updateUser.run(exp, level, messages, guildId, userId);
    }

    static getLeaderboard(guildId, limit = 10) {
        const results = statements.getLeaderboard.all(guildId, limit);
        return results.map(result => toCamelCase(result));
    }

    static getUserRank(guildId, userId) {
        const user = this.getUser(guildId, userId);
        if (!user) return null;
        const result = statements.getUserRank.get(guildId, user.lvl, user.lvl, user.exp);
        return result.rank;
    }

    // Level roles methods
    static getLevelRole(guildId, level) {
        const result = statements.getLevelRole.get(guildId, level);
        return result ? toCamelCase(result) : null;
    }

    static addLevelRole(guildId, level, roleId) {
        return statements.addLevelRole.run(guildId, level, roleId);
    }

    static removeLevelRole(guildId, level) {
        return statements.removeLevelRole.run(guildId, level);
    }

    static getAllLevelRoles(guildId) {
        const results = statements.getAllLevelRoles.all(guildId);
        return results.map(result => toCamelCase(result));
    }

    // Warning methods
    static addWarning(guildId, userId, moderatorId, reason, expiresAt = null) {
        return statements.addWarning.run(guildId, userId, moderatorId, reason, expiresAt);
    }

    static getUserWarnings(guildId, userId) {
        const results = statements.getUserWarnings.all(guildId, userId);
        return results.map(result => toCamelCase(result));
    }

    static removeWarning(warningId) {
        return statements.removeWarning.run(warningId);
    }

    static clearUserWarnings(guildId, userId) {
        return statements.clearUserWarnings.run(guildId, userId);
    }

    // Mute methods
    static addMute(guildId, userId, moderatorId, reason, expiresAt = null) {
        return statements.addMute.run(guildId, userId, moderatorId, reason, expiresAt);
    }

    static getMute(guildId, userId) {
        const result = statements.getMute.get(guildId, userId);
        return result ? toCamelCase(result) : null;
    }

    static removeMute(guildId, userId) {
        return statements.removeMute.run(guildId, userId);
    }

    // Ticket methods
    static getTicketSettings(guildId) {
        const result = statements.getTicketSettings.get(guildId);
        if (!result) return null;

        const settings = toCamelCase(result);
        if (settings.staffRoleIds) {
            try {
                settings.staffRoleIds = JSON.parse(settings.staffRoleIds);
            } catch {
                settings.staffRoleIds = [];
            }
        }
        return settings;
    }

    static setTicketSettings(guildId, categoryId, staffRoleIds, logChannelId) {
        return statements.setTicketSettings.run(guildId, categoryId, JSON.stringify(staffRoleIds || []), logChannelId);
    }

    static getNextTicketNumber(guildId) {
        // Ensure ticket settings exist first
        let settings = this.getTicketSettings(guildId);
        if (!settings) {
            statements.setTicketSettings.run(guildId, null, '[]', null);
            settings = this.getTicketSettings(guildId);
        }

        const result = statements.getNextTicketNumber.get(guildId);
        return result ? result.ticket_number : 1;
    }

    static createTicket(guildId, userId, channelId, reason) {
        const ticketNumber = this.getNextTicketNumber(guildId);
        const result = statements.createTicket.run(guildId, userId, channelId, ticketNumber, reason);
        return result.lastInsertRowid;
    }

    static getTicketByChannel(channelId) {
        const result = statements.getTicketByChannel.get(channelId);
        return result ? toCamelCase(result) : null;
    }

    static getUserTicket(guildId, userId) {
        const result = statements.getUserTicket.get(guildId, userId);
        return result ? toCamelCase(result) : null;
    }

    static getOpenTickets(guildId) {
        const results = statements.getOpenTickets.all(guildId);
        return results.map(result => toCamelCase(result));
    }

    static claimTicket(ticketId, userId) {
        return statements.claimTicket.run(userId, ticketId);
    }

    static closeTicket(ticketId, closedBy) {
        return statements.closeTicket.run(closedBy, ticketId);
    }

    // Giveaway methods
    static createGiveaway(guildId, channelId, messageId, hostId, title, description, winnerCount, requirements, endsAt) {
        const result = statements.createGiveaway.run(guildId, channelId, messageId, hostId, title, description, winnerCount, JSON.stringify(requirements || []), endsAt);
        return result.lastInsertRowid;
    }

    static getGiveaway(messageId) {
        const result = statements.getGiveaway.get(messageId);
        if (!result) return null;

        const giveaway = toCamelCase(result);
        if (giveaway.requirements) {
            try {
                giveaway.requirements = JSON.parse(giveaway.requirements);
            } catch {
                giveaway.requirements = [];
            }
        }
        return giveaway;
    }

    static getActiveGiveaways() {
        const results = statements.getActiveGiveaways.all(new Date().toISOString());
        return results.map(result => {
            const giveaway = toCamelCase(result);
            if (giveaway.requirements) {
                try {
                    giveaway.requirements = JSON.parse(giveaway.requirements);
                } catch {
                    giveaway.requirements = [];
                }
            }
            return giveaway;
        });
    }

    static endGiveaway(giveawayId) {
        return statements.endGiveaway.run(giveawayId);
    }

    static addGiveawayEntry(giveawayId, userId) {
        return statements.addGiveawayEntry.run(giveawayId, userId);
    }

    static getGiveawayEntries(giveawayId) {
        const results = statements.getGiveawayEntries.all(giveawayId);
        return results.map(result => toCamelCase(result));
    }

    static removeGiveawayEntry(giveawayId, userId) {
        return statements.removeGiveawayEntry.run(giveawayId, userId);
    }

    // Moderation log methods
    static addModLog(guildId, actionType, targetUserId, moderatorId, reason, duration = null) {
        return statements.addModLog.run(guildId, actionType, targetUserId, moderatorId, reason, duration);
    }

    static getModLogs(guildId, userId, limit = 10) {
        const results = statements.getModLogs.all(guildId, userId, limit);
        return results.map(result => toCamelCase(result));
    }

    // Daily stats reset method
    static resetDailyStats() {
        // Add any daily reset logic here
        Logger.info('Daily stats reset completed');
    }

    // Cleanup expired records
    static cleanup() {
        try {
            // Clean expired warnings
            db.exec('DELETE FROM warnings WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP');

            // Clean expired mutes
            db.exec('DELETE FROM mutes WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP');

            // Clean old channel messages (keep only last 100 per channel)
            const channels = db.prepare('SELECT DISTINCT channel_id FROM channel_messages').all();
            for (const {channel_id} of channels) {
                statements.cleanOldChannelMessages.run(channel_id, channel_id);
            }

            Logger.info('Database cleanup completed');
        } catch (error) {
            Logger.error('Database cleanup error:', error);
        }
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    db.close();
    process.exit(0);
});

module.exports = DatabaseManager;