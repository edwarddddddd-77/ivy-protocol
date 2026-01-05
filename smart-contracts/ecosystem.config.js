/**
 * PM2 Ecosystem Configuration
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 logs
 *   pm2 status
 *   pm2 stop all
 *   pm2 restart all
 */

module.exports = {
  apps: [
    {
      name: "ivy-price-keeper",
      script: "./scripts/price-keeper.js",

      // Instances
      instances: 1,
      exec_mode: "fork",

      // Auto restart
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",

      // Restart strategy
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,

      // Error handling
      error_file: "./logs/keeper-error.log",
      out_file: "./logs/keeper-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      // Environment
      env: {
        NODE_ENV: "production",
      },

      // Cron restart (daily at 3 AM)
      cron_restart: "0 3 * * *",
    },
  ],
};
