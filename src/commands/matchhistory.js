const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const sharp = require('sharp');

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

            // Generate SVG for match history
            const svgContent = generateMatchHistorySVG(await Promise.all(
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
            ));

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
    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${matches.length * 80 + 20}">
        <defs>
            <style>
                @font-face {
                    font-family: 'PUBGFont';
                    src: url('/assets/fonts/pubg-font.ttf');
                }
                .match-row { filter: brightness(0.9); }
                .match-row:hover { filter: brightness(1.1); }
                .highlight { fill: #FFD700; }
                .placement { font-family: 'PUBGFont', sans-serif; font-size: 24px; }
                .stats { font-family: 'PUBGFont', sans-serif; font-size: 18px; }
            </style>
        </defs>

        <!-- Background -->
        <rect width="100%" height="100%" fill="#1A1A1A"/>

        ${matches.map((match, index) => {
            const stats = match.playerStats.attributes.stats;
            const matchInfo = match.matchData.data.attributes;
            const timeSince = getTimeSinceMatch(new Date(matchInfo.createdAt));
            
            return `
            <g class="match-row" transform="translate(0,${index * 80})">
                <!-- Map background image would go here in a real implementation -->
                <rect width="1000" height="75" fill="#2A2A2A"/>
                
                <!-- Placement -->
                <text x="20" y="45" class="placement ${stats.winPlace === 1 ? 'highlight' : ''}" fill="white">
                    #${stats.winPlace}/${matchInfo.totalParticipants}
                </text>

                <!-- Match info -->
                <text x="150" y="30" class="stats" fill="#888">${timeSince}</text>
                <text x="150" y="55" class="stats" fill="#888">
                    ${matchInfo.matchType.toUpperCase()} MODE
                </text>

                <!-- Game mode -->
                <text x="400" y="45" class="stats" fill="white">SQUAD TPP</text>

                <!-- Stats -->
                <text x="600" y="45" class="stats" fill="white">${stats.kills}</text>
                <text x="700" y="45" class="stats" fill="white">${stats.assists}</text>
                <text x="800" y="45" class="stats" fill="white">${Math.round(stats.damageDealt)}</text>
                <text x="900" y="45" class="stats" fill="white">${formatTime(stats.timeSurvived)}</text>
            </g>
            `;
        }).join('')}
    </svg>`;
}

function getTimeSinceMatch(date) {
    const hours = Math.floor((new Date() - date) / (1000 * 60 * 60));
    if (hours < 24) {
        return `${hours} HOURS AGO`;
    }
    return `${Math.floor(hours / 24)} DAYS AGO`;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}