const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPUBGPlayer, getCurrentSeason, getPlayerSeasonStats } = require('../services/pubgApi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seasonrank')
        .setDescription('Get player\'s current season ranking')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('PUBG username to look up')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const username = interaction.options.getString('username');
            
            // Get player and season data
            const playerData = await getPUBGPlayer(username);
            const currentSeason = await getCurrentSeason();
            const seasonStats = await getPlayerSeasonStats(playerData.id, currentSeason.id);

            // Get stats for different game modes
            const modes = ['solo-fpp', 'duo-fpp', 'squad-fpp'];
            const embeds = [];

            for (const mode of modes) {
                const stats = seasonStats.data.attributes.rankedGameModeStats[mode];
                if (!stats || !stats.roundsPlayed) continue;

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`${mode.split('-')[0].toUpperCase()} Season Stats for ${username}`)
                    .addFields(
                        { name: 'Current Rank', value: `${stats.currentTier.tier} ${stats.currentTier.subTier}`, inline: true },
                        { name: 'Rank Points', value: Math.round(stats.currentRankPoint).toString(), inline: true },
                        { name: 'Best Rank', value: `${stats.bestTier.tier} ${stats.bestTier.subTier}`, inline: true },
                        { name: 'Matches', value: stats.roundsPlayed.toString(), inline: true },
                        { name: 'Wins', value: stats.wins.toString(), inline: true },
                        { name: 'Win Rate', value: `${((stats.wins / stats.roundsPlayed) * 100).toFixed(1)}%`, inline: true },
                        { name: 'K/D Ratio', value: (stats.kills / Math.max(1, stats.roundsPlayed)).toFixed(2), inline: true },
                        { name: 'Avg Damage', value: Math.round(stats.damageDealt / Math.max(1, stats.roundsPlayed)).toString(), inline: true },
                        { name: 'Top 10 Rate', value: `${((stats.top10Ratio) * 100).toFixed(1)}%`, inline: true }
                    )
                    .setFooter({ text: `Season: ${currentSeason.attributes.isOffseason ? 'Off-season' : currentSeason.id}` });

                embeds.push(embed);
            }

            if (embeds.length === 0) {
                return await interaction.editReply('No ranked statistics found for this player this season.');
            }

            // Send first embed in initial reply
            await interaction.editReply({ embeds: [embeds[0]] });

            // Send remaining embeds as follow-ups
            for (let i = 1; i < embeds.length; i++) {
                await interaction.followUp({ embeds: [embeds[i]] });
            }

        } catch (error) {
            console.error('Error in seasonrank command:', error);
            await interaction.editReply(`Error: ${error.message}`);
        }
    },
};