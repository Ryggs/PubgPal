const { SlashCommandBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const { formatDuration } = require('../utils/formatters');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('matchhistory')
        .setDescription('Get PUBG match history for a player')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('PUBG username to look up')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('matches')
                .setDescription('Number of matches to show (default: 5, max: 10)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const username = interaction.options.getString('username');
            const matchLimit = Math.min(interaction.options.getInteger('matches') || 5, 10);

            const playerData = await getPUBGPlayer(username);
            const matchIds = playerData.relationships.matches.data.slice(0, matchLimit);

            const matches = [];
            for (const matchId of matchIds) {
                try {
                    const matchData = await getMatchData(matchId.id);
                    const playerStats = matchData.included.find(
                        item => item.type === 'participant' && 
                        item.attributes.stats.name.toLowerCase() === username.toLowerCase()
                    );

                    if (playerStats) {
                        const stats = playerStats.attributes.stats;
                        const embed = new EmbedBuilder()
                            .setColor(stats.winPlace === 1 ? '#FFD700' : '#0099ff')
                            .setTitle(`Match Results for ${username}`)
                            .setDescription(`${matchData.data.attributes.gameMode} - ${matchData.data.attributes.mapName}`)
                            .addFields(
                                { name: 'Placement', value: `#${stats.winPlace}${stats.winPlace === 1 ? ' 🏆' : ''}`, inline: true },
                                { name: 'Kills', value: stats.kills.toString(), inline: true },
                                { name: 'Assists', value: stats.assists.toString(), inline: true },
                                { name: 'Damage', value: Math.round(stats.damageDealt).toString(), inline: true },
                                { name: 'Survival Time', value: formatDuration(stats.timeSurvived), inline: true },
                                { name: 'Distance', value: `${Math.round(stats.walkDistance + stats.rideDistance)}m`, inline: true },
                                { name: 'Headshots', value: stats.headshotKills.toString(), inline: true },
                                { name: 'Revives', value: stats.revives.toString(), inline: true },
                                { name: 'Heals', value: (stats.heals + stats.boosts).toString(), inline: true }
                            )
                            .setFooter({ text: new Date(matchData.data.attributes.createdAt).toLocaleString() });

                        matches.push(embed);
                    }
                } catch (error) {
                    console.error(`Error fetching match ${matchId}:`, error);
                    continue;
                }
            }

            if (matches.length === 0) {
                return await interaction.editReply('No recent matches found for this player.');
            }

            // Send first match in initial reply
            await interaction.editReply({ embeds: [matches[0]] });

            // Send remaining matches as follow-ups
            for (let i = 1; i < matches.length; i++) {
                await interaction.followUp({ embeds: [matches[i]] });
            }

        } catch (error) {
            console.error('Error in matchhistory command:', error);
            await interaction.editReply(`Error: ${error.message}`);
        }
    },
};