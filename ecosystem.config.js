module.exports = {
  apps: [
    {
      name: 'boedekasse',
      script: 'dist/index.js',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
