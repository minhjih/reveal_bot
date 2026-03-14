// PM2 config — for running WITHOUT Docker (directly on EC2)
module.exports = {
  apps: [
    {
      name: "reveal-bot",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/home/ubuntu/reveal_bot",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Auto-restart
      max_memory_restart: "512M",
      exp_backoff_restart_delay: 100,
      // Logs
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/home/ubuntu/logs/reveal-error.log",
      out_file: "/home/ubuntu/logs/reveal-out.log",
      merge_logs: true,
    },
  ],
};
