module.exports = {
  apps : [
    {
      name: `app-name`,
      script: 'faye.js',
      instances: "max",
      exec_mode: "cluster",
      env_development: {
        NODE_ENV: process.env.NODE_ENV
      },
      env_staging: {
        NODE_ENV: process.env.NODE_ENV
      },
      env_production: {
        NODE_ENV: process.env.NODE_ENV
      }
    }
  ],
};