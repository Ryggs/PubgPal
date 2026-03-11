const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData, getCurrentSeason, getPlayerSeasonStats, getSurvivalMastery } = require('../services/pubgApi');
const puppeteer = require('puppeteer');
const axios = require('axios');
const { getMapDisplayName, getRankInsigniaUrl, getMapImageUrl } = require('../utils/assets');

const MAX_TEAM_MEMBERS = 4;

// Preferred mode order for finding ranked stats
const MODE_PRIORITY = ['squad-fpp', 'squad', 'duo-fpp', 'duo', 'solo-fpp', 'solo'];

function formatTime(seconds) {
    if (!seconds) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function findPlayerRankInfo(rankedStats) {
    if (!rankedStats) return null;
    for (const mode of MODE_PRIORITY) {
        const stats = rankedStats[mode];
        if (stats && stats.currentTier && stats.currentTier.tier !== 'Unranked') {
            return stats.currentTier;
        }
    }
    return null;
}

async function fetchImageBase64(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 5000
        });
        return `data:image/png;base64,${Buffer.from(response.data).toString('base64')}`;
    } catch {
        return '';
    }
}

function isTDMMode(gameMode) {
    return gameMode && gameMode.toLowerCase().includes('tdm');
}

function getSurvivalTierColor(level) {
    if (level >= 400) return '#e74c3c';  // Red - Tier 5
    if (level >= 300) return '#9b59b6';  // Purple - Tier 4
    if (level >= 200) return '#3498db';  // Blue - Tier 3
    if (level >= 100) return '#2ecc71';  // Green - Tier 2
    return '#95a5a6';                     // Gray - Tier 1
}

function generateMatchReportHTML(matchData, playerStats, teamMembers, totalParticipants, rankBadge, mapImageBase64, survivalLevel) {
    const mapName = matchData.data.attributes.mapName;
    const gameMode = matchData.data.attributes.gameMode || 'squad';
    const matchType = matchData.data.attributes.matchType;
    const pStats = playerStats.attributes.stats;

    const perspective = gameMode.toLowerCase().includes('fpp') ? 'FPP' : 'TPP';
    const modeBase = gameMode.replace(/-?fpp/i, '').replace(/-?tpp/i, '').toUpperCase() || 'SQUAD';
    const matchTypeLabel = matchType === 'competitive' ? 'RANKED' : 'NORMAL';

    const mapBgStyle = mapImageBase64
        ? `background-image: linear-gradient(rgba(10,10,10,0.7), rgba(10,10,10,0.75)), url('${mapImageBase64}');
           background-size: cover;
           background-position: center;`
        : 'background: #141414;';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                width: 820px;
                background: #0d0d0d;
                font-family: 'Rajdhani', Arial, sans-serif;
                color: white;
                display: inline-block;
            }
            .wrapper {
                display: inline-block;
                width: 820px;
            }

            /* ── Summary bar ── */
            .summary-bar {
                display: flex;
                align-items: center;
                ${mapBgStyle}
                padding: 16px 30px;
                border-bottom: 1px solid #222;
            }
            .summary-item { flex: 1; }
            .summary-item:last-child { text-align: right; }
            .summary-label {
                font-size: 10px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 2px;
                text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            }
            .summary-value {
                font-size: 24px;
                font-weight: 700;
                letter-spacing: 1px;
                text-shadow: 0 1px 4px rgba(0,0,0,0.9);
            }
            .summary-value.gold { color: #FFD700; }

            /* ── Column headers ── */
            .col-headers {
                display: flex;
                align-items: center;
                padding: 10px 30px;
                background: #0d0d0d;
                border-bottom: 1px solid #1a1a1a;
            }
            .col-name-header {
                width: 260px;
                font-size: 11px;
                color: #444;
                text-transform: uppercase;
                letter-spacing: 2px;
                font-weight: 600;
            }
            .col-header {
                flex: 1;
                text-align: center;
                font-size: 11px;
                color: #444;
                text-transform: uppercase;
                letter-spacing: 2px;
                font-weight: 600;
            }

            /* ── Player rows ── */
            .player-row {
                display: flex;
                align-items: center;
                padding: 0 30px;
                height: 58px;
                background: #141414;
                border-bottom: 1px solid #1a1a1a;
            }
            .player-row:nth-child(even) {
                background: #121212;
            }
            .player-row:last-child {
                border-bottom: none;
            }

            .player-name-area {
                width: 260px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .rank-badge {
                width: 32px;
                height: 32px;
                object-fit: contain;
                flex-shrink: 0;
            }
            .level-badge {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 700;
                flex-shrink: 0;
                border: 2px solid;
            }
            .player-name {
                font-size: 16px;
                font-weight: 700;
                letter-spacing: 0.5px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .player-stat {
                flex: 1;
                text-align: center;
                font-size: 18px;
                font-weight: 600;
            }
            .player-stat.dmg { color: #FFD700; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="summary-bar">
                <div class="summary-item">
                    <div class="summary-label">Placement</div>
                    <div class="summary-value gold">#${pStats.winPlace} / ${totalParticipants}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Map</div>
                    <div class="summary-value">${getMapDisplayName(mapName)}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Match Type</div>
                    <div class="summary-value">${matchTypeLabel} | ${modeBase} ${perspective}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Play Time</div>
                    <div class="summary-value">${formatTime(pStats.timeSurvived)}</div>
                </div>
            </div>

            <div class="col-headers">
                <div class="col-name-header">Name</div>
                <div class="col-header">Kills</div>
                <div class="col-header">Damage</div>
                <div class="col-header">Assists</div>
                <div class="col-header">Revives</div>
                <div class="col-header">Time Alive</div>
            </div>

            ${teamMembers.map(member => {
                const s = member.attributes.stats;
                const levelBadge = survivalLevel != null
                    ? `<div class="level-badge" style="border-color: ${getSurvivalTierColor(survivalLevel)}; color: ${getSurvivalTierColor(survivalLevel)};">${survivalLevel}</div>`
                    : '';
                return `
                <div class="player-row">
                    <div class="player-name-area">
                        ${rankBadge ? `<img class="rank-badge" src="${rankBadge}"/>` : ''}
                        ${levelBadge}
                        <div class="player-name">${s.name}</div>
                    </div>
                    <div class="player-stat">${s.kills || 0}</div>
                    <div class="player-stat dmg">${Math.round(s.damageDealt || 0)}</div>
                    <div class="player-stat">${s.assists || 0}</div>
                    <div class="player-stat">${s.revives || 0}</div>
                    <div class="player-stat">${formatTime(s.timeSurvived)}</div>
                </div>`;
            }).join('')}
        </div>
    </body>
    </html>`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('match')
        .setDescription('Get detailed stats for your most recent PUBG match')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('PUBG username to look up')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        let browser = null;

        try {
            const username = interaction.options.getString('username');
            const playerData = await getPUBGPlayer(username);

            const latestMatchId = playerData.relationships.matches.data[0].id;
            const matchData = await getMatchData(latestMatchId);

            const playerStats = matchData.included.find(
                item => item.type === 'participant' &&
                item.attributes.stats.name.toLowerCase() === username.toLowerCase()
            );

            if (!playerStats) {
                return await interaction.editReply('No match data found for this player.');
            }

            const gameMode = matchData.data.attributes.gameMode || '';
            const teamId = playerStats.attributes.stats.teamId;
            const isTDM = isTDMMode(gameMode);

            let teamMembers = matchData.included.filter(
                item => item.type === 'participant' &&
                item.attributes.stats.teamId === teamId &&
                item.attributes.stats.teamId !== 0
            ).sort((a, b) => {
                const killsDiff = b.attributes.stats.kills - a.attributes.stats.kills;
                if (killsDiff !== 0) return killsDiff;
                return b.attributes.stats.damageDealt - a.attributes.stats.damageDealt;
            });

            // Limit team members to 4 for non-TDM modes
            if (!isTDM) {
                teamMembers = teamMembers.slice(0, MAX_TEAM_MEMBERS);
            }

            const totalParticipants = matchData.included.filter(
                item => item.type === 'participant'
            ).length;

            // Fetch player's ranked tier badge and survival level (non-blocking, parallel)
            let rankBadge = '';
            let mapImageBase64 = '';
            let survivalLevel = null;

            const mapName = matchData.data.attributes.mapName;

            const [rankResult, mapResult, masteryResult] = await Promise.allSettled([
                (async () => {
                    const season = await getCurrentSeason();
                    const seasonStats = await getPlayerSeasonStats(playerData.id, season.id);
                    const rankedStats = seasonStats.data?.attributes?.rankedGameModeStats;
                    const tierInfo = findPlayerRankInfo(rankedStats);
                    if (tierInfo) {
                        return await fetchImageBase64(getRankInsigniaUrl(tierInfo.tier, tierInfo.subTier));
                    }
                    return '';
                })(),
                fetchImageBase64(getMapImageUrl(mapName)),
                getSurvivalMastery(playerData.id)
            ]);

            if (rankResult.status === 'fulfilled') rankBadge = rankResult.value;
            if (mapResult.status === 'fulfilled') mapImageBase64 = mapResult.value;
            if (masteryResult.status === 'fulfilled' && masteryResult.value) {
                survivalLevel = masteryResult.value.data?.attributes?.level ?? null;
            }

            const html = generateMatchReportHTML(matchData, playerStats, teamMembers, totalParticipants, rankBadge, mapImageBase64, survivalLevel);

            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                timeout: 30000
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 820, height: 600 });
            await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });

            const screenshot = await page.screenshot({
                type: 'png',
                fullPage: true,
                omitBackground: false
            });

            const attachment = new AttachmentBuilder(Buffer.from(screenshot), {
                name: 'match-report.png'
            });

            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error in match command:', error);
            await interaction.editReply(`Error: ${error.message}`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    },
};
