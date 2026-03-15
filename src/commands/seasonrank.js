const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getCurrentSeason, getPlayerSeasonStats } = require('../services/pubgApi');
const sharp = require('sharp');

// Preferred mode order for finding stats
const MODE_PRIORITY = ['squad-fpp', 'squad', 'duo-fpp', 'duo', 'solo-fpp', 'solo'];

const MODE_DISPLAY_NAMES = {
    'squad-fpp': 'SQUAD FPP',
    'squad': 'SQUAD TPP',
    'duo-fpp': 'DUO FPP',
    'duo': 'DUO TPP',
    'solo-fpp': 'SOLO FPP',
    'solo': 'SOLO TPP'
};

function findBestModeStats(rankedStats) {
    if (!rankedStats) return null;

    for (const mode of MODE_PRIORITY) {
        const stats = rankedStats[mode];
        if (stats && stats.roundsPlayed > 0) {
            return { mode, stats };
        }
    }

    // Fallback: try any mode with rounds played
    for (const [mode, stats] of Object.entries(rankedStats)) {
        if (stats && stats.roundsPlayed > 0) {
            return { mode, stats };
        }
    }

    return null;
}

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

            const rankedStats = seasonStats.data?.attributes?.rankedGameModeStats;
            const bestMode = findBestModeStats(rankedStats);

            if (!bestMode) {
                return await interaction.editReply(
                    `No ranked statistics found for **${username}** this season.`
                );
            }

            const svgContent = generateSeasonRankSVG(bestMode.stats, bestMode.mode, currentSeason);

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

function generateSeasonRankSVG(stats, mode, currentSeason) {
    const modeName = MODE_DISPLAY_NAMES[mode] || mode.toUpperCase();
    const kd = (stats.kills / Math.max(1, stats.deaths || 1)).toFixed(2);
    const avgDamage = Math.round(stats.damageDealt / Math.max(1, stats.roundsPlayed));
    const winRate = stats.roundsPlayed > 0
        ? ((stats.wins / stats.roundsPlayed) * 100).toFixed(1)
        : '0.0';
    const top10s = stats.top10Ratio != null
        ? Math.round(stats.top10Ratio * stats.roundsPlayed)
        : stats.top10s || 0;

    // Season ID formatting — strip prefix if present
    const seasonLabel = currentSeason.id.replace(/^division\.bro\.official\.pc-[\d]+-?/, 'Season ');

    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="420">
        <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#FFD700"/>
                <stop offset="100%" style="stop-color:#DAA520"/>
            </linearGradient>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#1a1a1a"/>
                <stop offset="100%" style="stop-color:#111"/>
            </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="800" height="420" fill="url(#bgGrad)" rx="8"/>

        <!-- Header -->
        <text x="40" y="45" fill="#FFD700" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" letter-spacing="2">${seasonLabel.toUpperCase()}</text>
        <text x="40" y="70" fill="#888" font-family="Arial, sans-serif" font-size="14" letter-spacing="1">${modeName}</text>

        <!-- Divider -->
        <line x1="40" y1="85" x2="760" y2="85" stroke="#333" stroke-width="1"/>

        <!-- Row 1 -->
        <g transform="translate(40,110)">
            <text x="0" y="0" fill="#666" font-family="Arial, sans-serif" font-size="12" letter-spacing="1.5">WINS</text>
            <text x="0" y="32" fill="url(#goldGrad)" font-family="Arial, sans-serif" font-size="36" font-weight="bold">${stats.wins}</text>

            <text x="180" y="0" fill="#666" font-family="Arial, sans-serif" font-size="12" letter-spacing="1.5">TOP 10</text>
            <text x="180" y="32" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">${top10s}</text>

            <text x="360" y="0" fill="#666" font-family="Arial, sans-serif" font-size="12" letter-spacing="1.5">MATCHES</text>
            <text x="360" y="32" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">${stats.roundsPlayed}</text>

            <text x="540" y="0" fill="#666" font-family="Arial, sans-serif" font-size="12" letter-spacing="1.5">WIN RATE</text>
            <text x="540" y="32" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">${winRate}%</text>
        </g>

        <!-- Row 2 -->
        <g transform="translate(40,210)">
            <text x="0" y="0" fill="#666" font-family="Arial, sans-serif" font-size="12" letter-spacing="1.5">K/D RATIO</text>
            <text x="0" y="32" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">${kd}</text>

            <text x="180" y="0" fill="#666" font-family="Arial, sans-serif" font-size="12" letter-spacing="1.5">KILLS</text>
            <text x="180" y="32" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">${stats.kills}</text>

            <text x="360" y="0" fill="#666" font-family="Arial, sans-serif" font-size="12" letter-spacing="1.5">AVG DAMAGE</text>
            <text x="360" y="32" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">${avgDamage}</text>

            <text x="540" y="0" fill="#666" font-family="Arial, sans-serif" font-size="12" letter-spacing="1.5">AVG RANK</text>
            <text x="540" y="32" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">#${Math.round(stats.avgRank || 0)}</text>
        </g>

        <!-- Row 3 -->
        <g transform="translate(40,310)">
            <text x="0" y="0" fill="#666" font-family="Arial, sans-serif" font-size="12" letter-spacing="1.5">ASSISTS</text>
            <text x="0" y="32" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">${stats.assists || 0}</text>

            <text x="180" y="0" fill="#666" font-family="Arial, sans-serif" font-size="12" letter-spacing="1.5">HEADSHOT KILLS</text>
            <text x="180" y="32" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">${stats.headshotKills || 0}</text>

            <text x="360" y="0" fill="#666" font-family="Arial, sans-serif" font-size="12" letter-spacing="1.5">LONGEST KILL</text>
            <text x="360" y="32" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">${Math.round(stats.longestKill || 0)}m</text>

            <text x="540" y="0" fill="#666" font-family="Arial, sans-serif" font-size="12" letter-spacing="1.5">AVG SURVIVE TIME</text>
            <text x="540" y="32" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">${formatTime(stats.avgTimeSurvived || 0)}</text>
        </g>
    </svg>`;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}
