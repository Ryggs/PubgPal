const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const { createCanvas } = require('@napi-rs/canvas');

// Debug function to log match data
function debugMatchData(match) {
    console.log('Match Data:', {
        stats: {
            placement: match.playerStats.attributes.stats.winPlace,
            kills: match.playerStats.attributes.stats.kills,
            assists: match.playerStats.attributes.stats.assists,
            damage: match.playerStats.attributes.stats.damageDealt,
            timeSurvived: match.playerStats.attributes.stats.timeSurvived
        },
        matchInfo: {
            type: match.matchData.data.attributes.matchType,
            total: match.matchData.data.attributes.totalParticipants,
            createdAt: match.matchData.data.attributes.createdAt
        }
    });
}

function createMatchHistory(matches) {
    console.log('Creating match history for', matches.length, 'matches');
    
    const rowHeight = 100;
    const width = 1200;
    const height = matches.length * rowHeight;
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Log canvas dimensions
    console.log('Canvas dimensions:', { width, height });

    // Background
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 0, width, height);

    matches.forEach((match, index) => {
        try {
            console.log(`Processing match ${index + 1}`);
            const stats = match.playerStats.attributes.stats;
            const matchInfo = match.matchData.data.attributes;
            const y = index * rowHeight;

            // Row background
            ctx.fillStyle = '#2A2A2A';
            ctx.fillRect(0, y, width, 95);

            // TEST: Draw a simple text to verify text rendering works
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '20px sans-serif';
            const testText = `Match ${index + 1}: Place #${stats.winPlace}, Kills: ${stats.kills}`;
            console.log('Drawing text:', testText);
            ctx.fillText(testText, 20, y + 50);

        } catch (error) {
            console.error(`Error processing match ${index}:`, error);
        }
    });

    console.log('Finished creating match history');
    return canvas;
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
            console.log('Starting matchhistory command');
            const username = interaction.options.getString('username');
            console.log('Username:', username);

            // Get player data
            const playerData = await getPUBGPlayer(username);
            console.log('Got player data');

            const matchIds = playerData.relationships.matches.data.slice(0, 8);
            console.log('Match IDs:', matchIds);

            const matches = await Promise.all(
                matchIds.map(async match => {
                    const matchData = await getMatchData(match.id);
                    const playerStats = matchData.included.find(
                        item => item.type === 'participant' && 
                        item.attributes.stats.name.toLowerCase() === username.toLowerCase()
                    );
                    return { matchData, playerStats };
                })
            );

            console.log('Got all match data');
            matches.forEach((match, index) => {
                console.log(`Match ${index + 1} debug data:`);
                debugMatchData(match);
            });

            const canvas = createMatchHistory(matches);
            console.log('Created canvas');

            const buffer = canvas.toBuffer('image/png');
            console.log('Created buffer');

            const attachment = new AttachmentBuilder(buffer, { name: 'match-history.png' });
            await interaction.editReply({ files: [attachment] });
            console.log('Sent response');

        } catch (error) {
            console.error('Error in matchhistory command:', error);
            await interaction.editReply(`Error: ${error.message}`);
        }
    }
};