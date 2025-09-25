/**
 * scheduled/tasks.js
 * Defines recurring scheduled tasks for your Discord bot.
 */

module.exports = {
  tasks: [
    {
      name: 'dailyReset',
      description: 'Reset daily counters and stats at a fixed interval (24h)',
      intervalMs: 24 * 60 * 60 * 1000, // 24 hours
      run: async (client) => {
        try {
          await client.db.resetDailyStats();
          client.logger.info('[Task: dailyReset] Daily stats reset completed.');
        } catch (error) {
          client.logger.error('[Task: dailyReset] Error resetting daily stats:', error);
        }
      }
    },
    {
      name: 'cleanupTempChannels',
      description: 'Deletes temporary channels starting with "temp-" older than 1 hour',
      intervalMs: 10 * 60 * 1000, // 10 minutes
      run: async (client) => {
        try {
          const now = Date.now();
          const tempChannels = client.channels.cache.filter(
            c => c.type === 0 && // 0 is GuildText for Discord.js v14
                 c.name.startsWith('temp-') &&
                 (c.createdTimestamp + 3600000 < now)
          );
          for (const channel of tempChannels.values()) {
            await channel.delete('Cleanup expired temp channel');
            client.logger.info(`[Task: cleanupTempChannels] Deleted channel ${channel.name}`);
          }
        } catch (error) {
          client.logger.error('[Task: cleanupTempChannels] Error cleaning up temp channels:', error);
        }
      }
    }
  ],

  startAll(client) {
    for (const task of this.tasks) {
      setInterval(() => task.run(client), task.intervalMs);
      client.logger.info(`[Scheduled Task] Started task: ${task.name} - ${task.description}`);
    }
  }
};
