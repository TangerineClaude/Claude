/**
 * PM2 Ecosystem Configuration
 * Used for running the product sync cron job
 * Install PM2: npm install -g pm2
 * Start: pm2 start ecosystem.config.cjs
 * Monitor: pm2 monit
 */

module.exports = {
  apps: [
    {
      name: 'kooperkai-sync',
      script: 'npm',
      args: 'run sync-products:watch',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/sync-error.log',
      out_file: './logs/sync-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
