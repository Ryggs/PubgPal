const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const sharp = require('sharp');
const match = require('./match');

const MAP_BACKGROUNDS = {
    'Baltic_Main': '/assets/maps/erangel.jpg',
    'Desert_Main': '/assets/maps/miramar.jpg',
    'Range_Main': '/assets/maps/sanhok.jpg',
    'Savage_Main': '/assets/maps/vikendi.jpg',
    'Kiki_Main': '/assets/maps/deston.jpg',
    'Tiger_Main': '/assets/maps/taego.jpg'
};

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
            const matchIds = playerData.relationships.matches.data.slice(0, 8); // Get last 8 matches

            //Get match data for all matches
            const matches = await Promise.all(
                matchIds.map(async match => {
                    const matchData = await getMatchData(match.id);
                    return{
                        matchData,
                        playerStats: matchData.included.find(
                            item => item.type === 'participant' &&
                            item.attributes.stats.name.toLowerCase() === username.toLowerCase()
                        )
                    }
                })
            );

            // Generate SVG for match history
            const svgContent = generateMatchHistorySVG(matches);

            // Convert SVG to PNG
            const pngBuffer = await sharp(Buffer.from(svgContent))
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

function generateMatchHistorySVG(matches) {
    const width = 1200;
    const rowHeight = 100;
    const height = matches.length * rowHeight;

    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
        <defs>
            <style>
                .match-row { font-family: Arial, sans-serif; }
                .placement { fill: #FFD700; font-weight: bold; }
                .sub-text { fill: #888888; }
                .stat-text { fill: #FFFFFF; }
                .mode-text { fill: #FFFFFF; }
            </style>
        </defs>

        ${matches.map((match, index) => {
            const stats = match.playerStats.attributes.stats;
            const matchInfo = match.matchData.data.attributes;
            const y = index * rowHeight;
            const timeSince = getTimeSinceMatch(new Date(matchInfo.createdAt));
            const isWin = stats.winPlace === 1;
            const mapName = matchInfo.mapName;

            // Get map background URL from MAP_ASSETS
            const mapImage = MAP_ASSETS[mapName + '_Thumbnail'] || '';

            return `
            <g class="match-row" transform="translate(0,${y})">
                <!-- Map Background -->
                <image href="${mapImage}" width="${width}" height="${rowHeight}" opacity="0.3"/>
                
                <!-- Dark Overlay -->
                <rect width="${width}" height="${rowHeight}" fill="rgba(0,0,0,0.7)"/>
                
                <!-- Win Indicator -->
                ${isWin ? `<rect width="4" height="${rowHeight}" fill="#FFD700"/>` : ''}
                
                <!-- Placement -->
                <text class="placement" x="20" y="65" font-size="42">#${stats.winPlace}</text>
                <text class="sub-text" x="85" y="65" font-size="24">/${matchInfo.totalParticipants}</text>
                
                <!-- Time and Mode -->
                <g transform="translate(250,40)">
                    <text class="sub-text" font-size="16">${timeSince}</text>
                    <text class="mode-text" x="0" y="35" font-size="20">
                        ${matchInfo.matchType === 'competitive' ? 'NORMAL' : 'CASUAL MODE'}
                    </text>
                </g>
                
                <!-- Game Type -->
                <text class="mode-text" x="500" y="65" font-size="20">SQUAD TPP</text>
                
                <!-- Stats -->
                <g transform="translate(700,40)">
                    <!-- Kills -->
                    <text class="stat-text" x="0" y="25" font-size="24" text-anchor="middle">${stats.kills}</text>
                    
                    <!-- Assists -->
                    <text class="stat-text" x="150" y="25" font-size="24" text-anchor="middle">${stats.assists}</text>
                    
                    <!-- Damage -->
                    <text class="stat-text" x="300" y="25" font-size="24" text-anchor="middle">
                        ${Math.round(stats.damageDealt)}
                    </text>
                    
                    <!-- Time Survived -->
                    <text class="stat-text" x="450" y="25" font-size="24" text-anchor="middle">
                        ${formatTime(stats.timeSurvived)}
                    </text>
                </g>
            </g>`;
        }).join('')}
    </svg>`;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Helper function to format time ago (e.g., "1 DAY AGO", "3 DAYS AGO")
function getTimeSinceMatch(date) {
    const hours = Math.floor((new Date() - date) / (1000 * 60 * 60));
    if (hours < 24) {
        return `${hours} HOURS AGO`;
    }
    const days = Math.floor(hours / 24);
    return `${days} DAY${days > 1 ? 'S' : ''} AGO`;
}