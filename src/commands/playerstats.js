const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPUBGPlayer } = require('../services/pubgApi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playerstats')
        .setDescription('Get PUBG player statistics')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('PUBG username to look up')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const username = interaction.options.getString('username');
            const playerData = await getPUBGPlayer(username);
            
            // Get stats for different game modes
            const stats = {
                solo: playerData.attributes.gameModeStats['solo-fpp'] || playerData.attributes.gameModeStats.solo,
                duo: playerData.attributes.gameModeStats['duo-fpp'] || playerData.attributes.gameModeStats.duo,
                squad: playerData.attributes.gameModeStats['squad-fpp'] || playerData.attributes.gameModeStats.squad
            };

            // Create embeds for each game mode
            const embeds = Object.entries(stats).map(([mode, modeStats]) => {
                if (!modeStats) return null;

                const kd = (modeStats.kills / Math.max(1, modeStats.roundsPlayed)).toFixed(2);
                const winRate = ((modeStats.wins / Math.max(1, modeStats.roundsPlayed)) * 100).toFixed(1);
                const avgDamage = Math.round(modeStats.damageDealt / Math.max(1, modeStats.roundsPlayed));

                return new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`${mode.charAt(0).toUpperCase() + mode.slice(1)} Stats for ${username}`)
                    .addFields(
                        { name: 'Matches', value: modeStats.roundsPlayed.toString(), inline: true },
                        { name: 'Wins', value: modeStats.wins.toString(), inline: true },
                        { name: 'Win Rate', value: `${winRate}%`, inline: true },
                        { name: 'Kills', value: modeStats.kills.toString(), inline: true },
                        { name: 'K/D Ratio', value: kd, inline: true },
                        { name: 'Avg Damage', value: avgDamage.toString(), inline: true },
                        { name: 'Top 10s', value: modeStats.top10s.toString(), inline: true },
                        { name: 'Headshot %', value: `${Math.round((modeStats.headshotKills / Math.max(1, modeStats.kills)) * 100)}%`, inline: true },
                        { name: 'Longest Kill', value: `${Math.round(modeStats.longestKill)}m`, inline: true }
                    );
            }).filter(embed => embed !== null);

            if (embeds.length === 0) {
                return await interaction.editReply('No statistics found for this player.');
            }

            // Send first embed in initial reply
            await interaction.editReply({ embeds: [embeds[0]] });

            // Send remaining embeds as follow-ups
            for (let i = 1; i < embeds.length; i++) {
                await interaction.followUp({ embeds: [embeds[i]] });
            }

        } catch (error) {
            console.error('Error in playerstats command:', error);
            await interaction.editReply(`Error: ${error.message}`);
        }
    },
};