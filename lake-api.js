module.exports = {
    apps : [{
      name: "lake-api",  
      script    : "yarn start",
      instances : "3",
      exec_mode : "cluster",
      cron_restart: "0 * * * *"
    }]
  }