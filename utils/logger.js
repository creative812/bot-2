const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logsDir = './logs';
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    this.logFile = path.join(this.logsDir, `bot-${new Date().toISOString().split('T')[0]}.log`);
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  writeLog(level, message, data = null) {
    const timestamp = this.getTimestamp();
    const logMessage = data 
      ? `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(data)}`
      : `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    // Console colors mapping
    const colors = {
      info: '\x1b[36m',    // cyan
      warn: '\x1b[33m',    // yellow
      error: '\x1b[31m',   // red
      debug: '\x1b[35m',   // magenta
      success: '\x1b[32m'  // green
    };
    const reset = '\x1b[0m';
    const color = colors[level] || reset;

    console.log(`${color}${logMessage}${reset}`);

    try {
      fs.appendFileSync(this.logFile, logMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message, data = null) {
    this.writeLog('info', message, data);
  }

  warn(message, data = null) {
    this.writeLog('warn', message, data);
  }

  error(message, data = null) {
    this.writeLog('error', message, data);
  }

  debug(message, data = null) {
    this.writeLog('debug', message, data);
  }

  success(message, data = null) {
    this.writeLog('success', message, data);
  }

  logCommand(command, user, guild) {
    this.info(`Command executed: ${command} by ${user.tag} (${user.id}) in ${guild ? guild.name : 'DM'}`);
  }

  logModeration(action, target, moderator, guild, reason) {
    this.info(`Moderation: ${action} - Target: ${target.tag} (${target.id}) - Moderator: ${moderator.tag} (${moderator.id}) - Guild: ${guild ? guild.name : 'DM'} - Reason: ${reason || 'No reason provided'}`);
  }

  cleanup(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const files = fs.readdirSync(this.logsDir);
      for (const file of files) {
        const filePath = path.join(this.logsDir, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile() && file.endsWith('.log') && stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          this.info(`Deleted old log file: ${file}`);
        }
      }
    } catch (error) {
      this.error('Failed to cleanup old log files:', error);
    }
  }
}

module.exports = new Logger();
