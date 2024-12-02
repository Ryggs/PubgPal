const { Events, ActivityType } = require('discord.js');
const { version } = require('../../package.json');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        try {
            // Log successful login
            console.log(`Ready! Logged in as ${client.user.tag}`);

            // Set the bot's activity/status
            client.user.setPresence({
                activities: [{ 
                    name: 'PUBG Stats', 
                    type: ActivityType.Watching 
                }],
                status: 'online'
            });

            // Log some basic info
            console.log(`Bot Version: ${version}`);
            console.log(`Serving ${client.guilds.cache.size} servers`);
            console.log(`Loaded ${client.commands.size} commands`);

            // Optional: Sync commands with Discord
            // Uncomment if you want to sync commands on startup
            /*
            try {
                console.log('Started refreshing application (/) commands.');
                await client.application.commands.set(
                    [...client.commands.values()].map(c => c.data)
                );
                console.log('Successfully reloaded application (/) commands.');
            } catch (error) {
                console.error('Error refreshing commands:', error);
            }
            */

        } catch (error) {
            console.error('Error in ready event:', error);
        }
    },
};