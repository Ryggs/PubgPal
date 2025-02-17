const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getCurrentSeason, getPlayerSeasonStats } = require('../services/pubgApi');
const sharp = require('sharp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seasonrank')
        .setDescription('Get player\'s current season stats')
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
            const currentSeason = await getCurrentSeason();
            const seasonStats = await getPlayerSeasonStats(playerData.id, currentSeason.id);

            // Generate SVG
            const svgContent = generateSeasonRankSVG(seasonStats, currentSeason);

            // Convert to PNG
            const pngBuffer = await sharp(Buffer.from(svgContent))
                .png()
                .toBuffer();

            const attachment = new AttachmentBuilder(pngBuffer, { name: 'season-rank.png' });
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error in seasonrank command:', error);
            await interaction.editReply(`Error: ${error.message}`);
        }
    }
};

function generateSeasonRankSVG(seasonStats, currentSeason) {
    const stats = seasonStats.data.attributes.rankedGameModeStats['squad-fpp'] || 
                 seasonStats.data.attributes.rankedGameModeStats.squad;

    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800">
        <defs>
            <style>
                @font-face {
                    font-family: 'PUBGFont';
                    src: url('/assets/fonts/pubg-font.ttf');
                }
                .title { font-family: 'PUBGFont', sans-serif; font-size: 32px; }
                .stat-label { font-family: 'PUBGFont', sans-serif; font-size: 16px; }
                .stat-value { font-family: 'PUBGFont', sans-serif; font-size: 24px; }
                .medal-count { font-family: 'PUBGFont', sans-serif; font-size: 28px; }
            </style>

            <!-- Medal patterns and gradients -->
            <linearGradient id="bronzeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#CD7F32"/>
                <stop offset="100%" style="stop-color:#8B4513"/>
            </linearGradient>
            <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#C0C0C0"/>
                <stop offset="100%" style="stop-color:#808080"/>
            </linearGradient>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#FFD700"/>
                <stop offset="100%" style="stop-color:#DAA520"/>
            </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="100%" height="100%" fill="#1A1A1A"/>

        <!-- Season Title -->
        <text x="50" y="50" class="title" fill="#FFFFFF">SEASON ${currentSeason.id}</text>
        <text x="50" y="80" class="stat-label" fill="#888888">TPP Squad</text>

        <!-- Main Stats -->
        <g transform="translate(50,120)">
            <!-- First Row -->
            <g transform="translate(0,0)">
                <text x="0" y="0" class="stat-label" fill="#888888">WINS</text>
                <text x="0" y="30" class="stat-value" fill="#FFFFFF">${stats.wins}</text>
                
                <text x="200" y="0" class="stat-label" fill="#888888">TOP 10</text>
                <text x="200" y="30" class="stat-value" fill="#FFFFFF">
                    ${Math.round(stats.top10Ratio * stats.roundsPlayed)}
                </text>
                
                <text x="400" y="0" class="stat-label" fill="#888888">MATCHES</text>
                <text x="400" y="30" class="stat-value" fill="#FFFFFF">${stats.roundsPlayed}</text>
            </g>

            <!-- Second Row -->
            <g transform="translate(0,80)">
                <text x="0" y="0" class="stat-label" fill="#888888">AVG PLACEMENT</text>
                <text x="0" y="30" class="stat-value" fill="#FFFFFF">${Math.round(stats.avgRank || 0)}</text>
                
                <text x="200" y="0" class="stat-label" fill="#888888">K/D RATIO</text>
                <text x="200" y="30" class="stat-value" fill="#FFFFFF">
                    ${(stats.kills / Math.max(1, stats.roundsPlayed)).toFixed(1)}
                </text>
                
                <text x="400" y="0" class="stat-label" fill="#888888">AVG DAMAGE</text>
                <text x="400" y="30" class="stat-value" fill="#FFFFFF">
                    ${Math.round(stats.damageDealt / Math.max(1, stats.roundsPlayed))}
                </text>
            </g>
        </g>

        <!-- Survival Level -->
        <g transform="translate(50,300)">
            <text x="0" y="0" class="stat-label" fill="#FFFFFF">SURVIVAL LEVEL</text>
            <circle cx="50" cy="50" r="40" fill="#2A2A2A" stroke="#CD7F32" stroke-width="2"/>
            <text x="50" y="60" class="stat-value" fill="#FFFFFF" text-anchor="middle">
                Lv.${stats.level || 1}
            </text>
            <text x="0" y="120" class="stat-label" fill="#888888">AVG SURVIVAL TIME</text>
            <text x="0" y="150" class="stat-value" fill="#FFFFFF">
                ${formatTime(stats.averageTimeAlive || 0)}
            </text>
        </g>

        <!-- Medals Section -->
        <g transform="translate(500,300)">
            <text x="0" y="0" class="stat-label" fill="#FFFFFF">MEDALS</text>
            
            <!-- Medal displays -->
            <g transform="translate(0,30)">
                <!-- Gold -->
                <circle cx="50" cy="50" r="30" fill="url(#goldGradient)"/>
                <text x="50" y="60" class="medal-count" fill="#FFFFFF" text-anchor="middle">33</text>
                
                <!-- Silver -->
                <circle cx="150" cy="50" r="30" fill="url(#silverGradient)"/>
                <text x="150" y="60" class="medal-count" fill="#FFFFFF" text-anchor="middle">24</text>
                
                <!-- Bronze -->
                <circle cx="250" cy="50" r="30" fill="url(#bronzeGradient)"/>
                <text x="250" y="60" class="medal-count" fill="#FFFFFF" text-anchor="middle">8</text>
            </g>
        </g>
    </svg>`;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}