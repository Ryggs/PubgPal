const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const logger = require('../src/utils/logger');

// Deployment configuration
const config = {
    production: {
        host: process.env.PROD_HOST,
        path: '/opt/pubg-bot',
        user: process.env.PROD_USER
    },
    staging: {
        host: process.env.STAGING_HOST,
        path: '/opt/pubg-bot-staging',
        user: process.env.STAGING_USER
    }
};

function deploy(environment = 'staging') {
    const env = config[environment];
    
    try {
        logger.info(`Starting deployment to ${environment}`);

        // Build the project
        logger.info('Building project...');
        execSync('npm run build', { stdio: 'inherit' });

        // Run tests
        logger.info('Running tests...');
        execSync('npm test', { stdio: 'inherit' });

        // Deploy to server
        logger.info(`Deploying to ${env.host}...`);
        execSync(
            `rsync -avz --exclude 'node_modules' --exclude 'logs' --exclude '.env' ./ ${env.user}@${env.host}:${env.path}`,
            { stdio: 'inherit' }
        );

        // Install dependencies and restart service on remote
        execSync(
            `ssh ${env.user}@${env.host} "cd ${env.path} && npm install --production && pm2 restart pubg-bot"`,
            { stdio: 'inherit' }
        );

        logger.info('Deployment completed successfully!');
    } catch (error) {
        logger.error('Deployment failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    const environment = process.argv[2] || 'staging';
    deploy(environment);
}

module.exports = deploy;