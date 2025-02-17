const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const { createCanvas } = require('canvas');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('matchhistory')
        .setDescription('Get PUBG match history')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('PUBG username to look up')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const username = interaction.options.getString('username');
            
            // Get player data
            const playerData = await getPUBGPlayer(username);
            const matchIds = playerData.relationships.matches.data.slice(0, 8);

            // Get match data
            const matches = await Promise.all(
                matchIds.map(async match => {
                    const matchData = await getMatchData(match.id);
                    return {
                        matchData,
                        playerStats: matchData.included.find(
                            item => item.type === 'participant' && 
                            item.attributes.stats.name.toLowerCase() === username.toLowerCase()
                        )
                    };
                })
            );

            // Create canvas
            const canvas = createCanvas(1200, matches.length * 100);
            const ctx = canvas.getContext('2d');

            // Set background
            ctx.fillStyle = '#1A1A1A';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw each match row
            matches.forEach((match, index) => {
                const y = index * 100;
                const stats = match.playerStats.attributes.stats;
                const matchInfo = match.matchData.data.attributes;
                const timeSince = getTimeSinceMatch(new Date(matchInfo.createdAt));

                // Row background
                ctx.fillStyle = '#2A2A2A';
                ctx.fillRect(0, y, canvas.width, 95);

                // Win indicator (yellow bar)
                if (stats.winPlace === 1) {
                    ctx.fillStyle = '#FFD700';
                    ctx.fillRect(0, y, 4, 95);
                }

                // Placement number
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 42px Arial';
                ctx.fillText(`#${stats.winPlace}`, 20, y + 60);

                // Total players
                ctx.fillStyle = '#888888';
                ctx.font = '24px Arial';
                ctx.fillText(`/${matchInfo.totalParticipants}`, 85, y + 60);

                // Time and mode
                ctx.fillStyle = '#888888';
                ctx.font = '16px Arial';
                ctx.fillText(timeSince, 250, y + 40);
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '20px Arial';
                ctx.fillText(matchInfo.matchType === 'competitive' ? 'NORMAL' : 'CASUAL MODE', 250, y + 75);

                // Game type
                ctx.fillText('SQUAD TPP', 500, y + 60);

                // Stats
                const stats_y = y + 60;
                ctx.textAlign = 'center';
                
                // Kills
                ctx.fillText(stats.kills.toString(), 700, stats_y);
                
                // Assists
                ctx.fillText(stats.assists.toString(), 850, stats_y);
                
                // Damage
                ctx.fillText(Math.round(stats.damageDealt).toString(), 1000, stats_y);
                
                // Time survived
                ctx.fillText(formatTime(stats.timeSurvived), 1150, stats_y);
            });

            // Convert canvas to buffer
            const buffer = canvas.toBuffer('image/png');
            
            // Send the image
            const attachment = new AttachmentBuilder(buffer, { name: 'match-history.png' });
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error in matchhistory command:', error);
            await interaction.editReply(`Error: ${error.message}`);
        }
    }
};

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function getTimeSinceMatch(date) {
    const hours = Math.floor((new Date() - date) / (1000 * 60 * 60));
    if (hours < 24) {
        return `${hours} HOURS AGO`;
    }
    const days = Math.floor(hours / 24);
    return `${days} DAY${days > 1 ? 'S' : ''} AGO`;
}