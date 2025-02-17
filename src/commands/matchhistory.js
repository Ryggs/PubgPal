const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const sharp = require('sharp');

function generateMatchHistorySVG(matches) {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
        <rect width="1200" height="800" fill="#1A1A1A"/>
        
        ${matches.map((match, index) => {
            const stats = match.playerStats.attributes.stats;
            const matchInfo = match.matchData.data.attributes;
            
            return `
            <g transform="translate(0,${index * 100})">
                <!-- Simple row background -->
                <rect width="1200" height="95" fill="#2A2A2A"/>
                
                <!-- Basic text elements -->
                <text x="20" y="60" fill="#FFD700" font-family="Arial" font-size="42" font-weight="bold">
                    #${stats.winPlace}
                </text>
                
                <text x="120" y="60" fill="white" font-family="Arial" font-size="24">
                    /${matchInfo.totalParticipants}
                </text>
                
                <!-- Stats as simple text -->
                <text x="700" y="60" fill="white" font-family="Arial" font-size="24">
                    K: ${stats.kills} A: ${stats.assists} D: ${Math.round(stats.damageDealt)}
                </text>
            </g>
            `;
        }).join('')}
    </svg>`;
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

            // Generate and convert SVG
            const svgContent = generateMatchHistorySVG(matches);
            
            // Log SVG content for debugging
            console.log('Generated SVG:', svgContent);

            // Try adding content type and encoding
            const svgWithHeader = `<?xml version="1.0" encoding="UTF-8"?>${svgContent}`;
            
            // Convert to PNG
            const pngBuffer = await sharp(Buffer.from(svgWithHeader))
                .png()
                .toBuffer();

            const attachment = new AttachmentBuilder(pngBuffer, { name: 'match-history.png' });
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error in matchhistory command:', error);
            await interaction.editReply(`Error: ${error.message}`);
        }
    }
};