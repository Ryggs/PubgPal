const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const { createCanvas } = require('canvas');

function createMatchHistory(matches) {
    const rowHeight = 100;
    const width = 1200;
    const height = matches.length * rowHeight;
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Set background
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 0, width, height);

    matches.forEach((match, index) => {
        const stats = match.playerStats.attributes.stats;
        const matchInfo = match.matchData.data.attributes;
        const y = index * rowHeight;

        // Row background
        ctx.fillStyle = '#2A2A2A';
        ctx.fillRect(0, y, width, 95);

        // Win indicator (yellow bar for #1 placement)
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

        // Time since match
        const timeSince = getTimeSinceMatch(new Date(matchInfo.createdAt));
        ctx.fillStyle = '#888888';
        ctx.font = '16px Arial';
        ctx.fillText(timeSince, 250, y + 40);

        // Game mode
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '20px Arial';
        const gameMode = matchInfo.matchType === 'competitive' ? 'NORMAL' : 'CASUAL MODE';
        ctx.fillText(gameMode, 250, y + 70);

        // Squad type
        ctx.fillText('SQUAD TPP', 500, y + 60);

        // Stats
        ctx.textAlign = 'center';
        const statsY = y + 60;
        
        // Draw stats values
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px Arial';
        ctx.fillText(stats.kills.toString(), 700, statsY);
        ctx.fillText(stats.assists.toString(), 850, statsY);
        ctx.fillText(Math.round(stats.damageDealt).toString(), 1000, statsY);
        ctx.fillText(formatTime(stats.timeSurvived), 1150, statsY);

        // Draw stats labels
        ctx.fillStyle = '#888888';
        ctx.font = '14px Arial';
        ctx.fillText('KILLS', 700, statsY + 20);
        ctx.fillText('ASSISTS', 850, statsY + 20);
        ctx.fillText('DAMAGE', 1000, statsY + 20);
        ctx.fillText('SURVIVAL', 1150, statsY + 20);
    });

    return canvas;
}

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
            const playerData = await getPUBGPlayer(username);
            const matchIds = playerData.relationships.matches.data.slice(0, 8);

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

            const canvas = createMatchHistory(matches);
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'match-history.png' });
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error in matchhistory command:', error);
            await interaction.editReply(`Error: ${error.message}`);
        }
    }
};