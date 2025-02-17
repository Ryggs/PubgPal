const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const { createCanvas } = require('@napi-rs/canvas');

function getGameMode(type) {
    switch(type?.toLowerCase()) {
        case 'airoyale': return 'AIR ROYALE';
        case 'arcade': return 'ARCADE';
        case 'official': return 'NORMAL';
        default: return 'CASUAL';
    }
}

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
        try {
            const stats = match.playerStats.attributes.stats;
            const matchInfo = match.matchData.data.attributes;
            const y = index * rowHeight;

            // Row background
            ctx.fillStyle = '#2A2A2A';
            ctx.fillRect(0, y, width, 95);

            // Win indicator for 1st place
            if (stats.winPlace === 1) {
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(0, y, 4, 95);
            }

            // Placement number
            ctx.textAlign = 'left';
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 42px sans-serif';
            ctx.fillText(`#${stats.winPlace}`, 20, y + 55);

            // Total players might be undefined, so we'll just show placement
            ctx.fillStyle = '#888888';
            ctx.font = '24px sans-serif';
            ctx.fillText(`/64`, 85, y + 55); // Default to typical 64 players

            // Time since match
            const timeSince = getTimeSinceMatch(new Date(matchInfo.createdAt));
            ctx.fillStyle = '#888888';
            ctx.font = '16px sans-serif';
            ctx.fillText(timeSince, 250, y + 35);

            // Game mode
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '20px sans-serif';
            ctx.fillText(getGameMode(matchInfo.type), 250, y + 65);

            // Stats section
            ctx.textAlign = 'center';
            
            // Kills
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '24px sans-serif';
            ctx.fillText(stats.kills.toString(), 700, y + 45);
            ctx.fillStyle = '#888888';
            ctx.font = '14px sans-serif';
            ctx.fillText('KILLS', 700, y + 65);

            // Assists
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '24px sans-serif';
            ctx.fillText(stats.assists.toString(), 850, y + 45);
            ctx.fillStyle = '#888888';
            ctx.font = '14px sans-serif';
            ctx.fillText('ASSISTS', 850, y + 65);

            // Damage
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '24px sans-serif';
            ctx.fillText(Math.round(stats.damageDealt).toString(), 1000, y + 45);
            ctx.fillStyle = '#888888';
            ctx.font = '14px sans-serif';
            ctx.fillText('DAMAGE', 1000, y + 65);

            // Time survived
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '24px sans-serif';
            ctx.fillText(formatTime(stats.timeSurvived), 1150, y + 45);
            ctx.fillStyle = '#888888';
            ctx.font = '14px sans-serif';
            ctx.fillText('SURVIVAL', 1150, y + 65);

        } catch (error) {
            console.error(`Error processing match ${index}:`, error);
        }
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
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'match-history.png' });
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error in matchhistory command:', error);
            await interaction.editReply(`Error: ${error.message}`);
        }
    }
};