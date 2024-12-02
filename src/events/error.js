const { Events } = require('discord.js');

module.exports = {
    name: Events.Error,
    once: false,
    execute(error) {
        // Log the error with timestamp
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] Discord client error:`, error);

        // Common error types and their handling
        if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
            console.error('Connection error. Check internet connectivity.');
        }

        if (error.httpStatus === 429) {
            console.error('Rate limit exceeded. Slowing down requests.');
        }

        if (error.code === 50001) {
            console.error('Missing Access. Check bot permissions.');
        }

        if (error.code === 50013) {
            console.error('Missing Permissions. Bot needs additional permissions.');
        }

        // API errors
        if (error.response) {
            console.error('API Error:', {
                status: error.response.status,
                statusText: error.response.statusText,
                url: error.response.config?.url,
                method: error.response.config?.method
            });
        }

        // Check if error is fatal
        const isFatalError = error.code === 'TOKEN_INVALID' || 
                           error.code === 'SHARDING_REQUIRED' ||
                           error.code === 'GUILD_MEMBERS_TIMEOUT';

        if (isFatalError) {
            console.error('Fatal error encountered. Restarting bot...');
            process.exit(1); // Process manager should restart the bot
        }

        // Optional: Send error to a logging channel if configured
        // if (process.env.ERROR_CHANNEL_ID) {
        //     try {
        //         const channel = client.channels.cache.get(process.env.ERROR_CHANNEL_ID);
        //         if (channel) {
        //             channel.send({
        //                 embeds: [{
        //                     color: 0xFF0000,
        //                     title: 'Bot Error',
        //                     description: `\`\`\`\n${error.stack || error}\n\`\`\``,
        //                     timestamp: new Date()
        //                 }]
        //             });
        //         }
        //     } catch (e) {
        //         console.error('Failed to send error to logging channel:', e);
        //     }
        // }
    },
};