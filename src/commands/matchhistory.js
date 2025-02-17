const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const { createCanvas } = require('canvas');

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

        // Placement number with simplified text
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 42px "Arial"';
        ctx.textAlign = 'left';
        ctx.fillText(`#${stats.winPlace}`, 20, y + 60);
        
        ctx.fillStyle = '#888888';
        ctx.font = '24px "Arial"';
        ctx.fillText(`/${matchInfo.totalParticipants}`, 85, y + 60);

        // Match info with simplified text
        const timeAgo = getTimeSinceMatch(new Date(matchInfo.createdAt));
        ctx.fillStyle = '#888888';
        ctx.font = '16px "Arial"';
        ctx.fillText(timeAgo, 250, y + 40);

        // Mode info
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '20px "Arial"';
        ctx.fillText(matchInfo.matchType === 'competitive' ? 'NORMAL' : 'CASUAL', 250, y + 70);

        // Squad info
        ctx.fillText('SQUAD', 500, y + 60);

        // Stats
        const positions = [
            { x: 700, label: 'K', value: stats.kills },
            { x: 850, label: 'A', value: stats.assists },
            { x: 1000, label: 'D', value: Math.round(stats.damageDealt) },
            { x: 1150, label: 'T', value: formatTime(stats.timeSurvived) }
        ];

        positions.forEach(pos => {
            ctx.textAlign = 'center';
            // Value
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '24px "Arial"';
            ctx.fillText(pos.value.toString(), pos.x, y + 45);
            
            // Label
            ctx.fillStyle = '#888888';
            ctx.font = '14px "Arial"';
            ctx.fillText(pos.label, pos.x, y + 70);
        });
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
        return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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