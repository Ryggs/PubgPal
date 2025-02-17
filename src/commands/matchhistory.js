const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

function createMatchHistory(matches) {
    const rowHeight = 100;
    const width = 1200;
    const height = matches.length * rowHeight;
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 0, width, height);

    matches.forEach((match, index) => {
        const stats = match.playerStats.attributes.stats;
        const matchInfo = match.matchData.data.attributes;
        const y = index * rowHeight;

        // Row background
        ctx.fillStyle = '#2A2A2A';
        ctx.fillRect(0, y, width, 95);

        // Win indicator
        if (stats.winPlace === 1) {
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(0, y, 4, 95);
        }

        // Reset text alignment
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Placement
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 42px sans-serif';
        ctx.fillText(`#${stats.winPlace}`, 20, y + 47);

        ctx.fillStyle = '#888888';
        ctx.font = '24px sans-serif';
        ctx.fillText(`/${matchInfo.totalParticipants}`, 90, y + 47);

        // Time ago
        const timeSince = getTimeSinceMatch(new Date(matchInfo.createdAt));
        ctx.font = '16px sans-serif';
        ctx.fillText(timeSince, 250, y + 35);

        // Game mode
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '20px sans-serif';
        ctx.fillText(matchInfo.matchType === 'competitive' ? 'NORMAL' : 'CASUAL MODE', 250, y + 65);
        
        // Game type
        ctx.fillText('SQUAD TPP', 500, y + 47);

        // Stats section
        ctx.textAlign = 'center';
        
        // Kills
        drawStat(ctx, stats.kills.toString(), 'KILLS', 700, y + 47);
        
        // Assists
        drawStat(ctx, stats.assists.toString(), 'ASSISTS', 850, y + 47);
        
        // Damage
        drawStat(ctx, Math.round(stats.damageDealt).toString(), 'DAMAGE', 1000, y + 47);
        
        // Time
        drawStat(ctx, formatTime(stats.timeSurvived), 'SURVIVAL', 1150, y + 47);
    });

    return canvas;
}

function drawStat(ctx, value, label, x, y) {
    // Value
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px sans-serif';
    ctx.fillText(value, x, y - 10);
    
    // Label
    ctx.fillStyle = '#888888';
    ctx.font = '14px sans-serif';
    ctx.fillText(label, x, y + 15);
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
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'match-history.png' });
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error in matchhistory command:', error);
            await interaction.editReply(`Error: ${error.message}`);
        }
    }
};