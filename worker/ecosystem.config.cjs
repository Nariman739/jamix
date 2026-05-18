// PM2 process manager config for production deployment on Hetzner.
// Usage on VPS:
//   pm2 start ecosystem.config.cjs
//   pm2 save
//   pm2 startup    # one-time, to enable auto-start on reboot

module.exports = {
  apps: [
    {
      name: "jamiwa-worker",
      cwd: "/opt/jamiwa/worker",
      script: "dist/worker/src/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
      error_file: "/var/log/jamiwa-worker.error.log",
      out_file: "/var/log/jamiwa-worker.out.log",
      merge_logs: true,
      time: true,
      // Restart with exponential backoff if crashes
      min_uptime: 30000,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
