const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const sharp = require('sharp');
const { MAP_ASSETS, MAP_NAMES } = require('./match'); // Import MAP_ASSETS from match.js

// Constants for map backgrounds (backup in case import fails)
const FALLBACK_MAP_ASSETS = {
    'Baltic_Main': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Baltic_Main.png',
    'Desert_Main': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Desert_Main.png',
    'Range_Main': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Range_Main.png',
    'Savage_Main': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Savage_Main.png',
    'Kiki_Main': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Kiki_Main.png',
    'Tiger_Main': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Tiger_Main.png'
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

            // Get map background URL, using thumbnail version if available
            const mapImageKey = mapName + '_Thumbnail';
            const mapImage = (MAP_ASSETS && MAP_ASSETS[mapImageKey]) || 
                           FALLBACK_MAP_ASSETS[mapName] || 
                           ''; // Fallback to empty string if no image found

            return `
            <g class="match-row" transform="translate(0,${y})">
                <!-- Background color (fallback if image fails) -->
                <rect width="${width}" height="${rowHeight}" fill="#1A1A1A"/>
                
                <!-- Map Background -->
                ${mapImage ? `<image href="${mapImage}" width="${width}" height="${rowHeight}" opacity="0.3"/>` : ''}
                
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

            const svgContent = generateMatchHistorySVG(matches);

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