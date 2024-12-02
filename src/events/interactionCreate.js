const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction) {
        // Handle only slash commands
        if (!interaction.isChatInputCommand()) return;

        // Get command from collection
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            await interaction.reply({ 
                content: 'Sorry, that command was not found.', 
                ephemeral: true 
            });
            return;
        }

        try {
            // Execute the command
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}`);
            console.error(error);

            // Handle errors that occur during command execution
            const errorMessage = {
                content: 'There was an error executing this command.',
                ephemeral: true
            };

            try {
                // If the interaction hasn't been replied to yet
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply(errorMessage);
                } else if (interaction.deferred) {
                    // If the interaction was deferred but not replied to
                    await interaction.editReply(errorMessage);
                } else {
                    // If the interaction was already replied to
                    await interaction.followUp(errorMessage);
                }
            } catch (followUpError) {
                console.error('Error sending error message:', followUpError);
            }
        }
    },
};