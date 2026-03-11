const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const puppeteer = require('puppeteer');
const axios = require('axios');
const { getMapDisplayName, getMapImageUrl } = require('../utils/assets');

function formatTime(seconds) {
    if (!seconds) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

async function fetchMapImage(mapName) {
    try {
        const url = getMapImageUrl(mapName);
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 8000
        });
        const base64 = Buffer.from(response.data).toString('base64');
        return `data:image/png;base64,${base64}`;
    } catch (err) {
        console.warn(`Failed to fetch map image for ${mapName}:`, err.message);
        return '';
    }
}

function generateMatchReportHTML(matchData, playerStats, teamMembers, totalParticipants, mapImage) {
    const mapName = matchData.data.attributes.mapName;
    const gameMode = matchData.data.attributes.gameMode || 'squad';
    const matchType = matchData.data.attributes.matchType;
    const pStats = playerStats.attributes.stats;

    // Determine FPP/TPP from gameMode string
    const perspective = gameMode.toLowerCase().includes('fpp') ? 'FPP' : 'TPP';
    const modeBase = gameMode.replace(/-?fpp/i, '').replace(/-?tpp/i, '').toUpperCase() || 'SQUAD';
    const matchTypeLabel = matchType === 'competitive' ? 'RANKED' : 'NORMAL';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                width: 1000px;
                background: #0d0d0d;
                font-family: 'Rajdhani', Arial, sans-serif;
                color: white;
            }

            /* ── Top summary bar ── */
            .summary-bar {
                display: flex;
                align-items: center;
                background: #141414;
                padding: 18px 40px;
                border-bottom: 1px solid #222;
            }
            .summary-item {
                flex: 1;
            }
            .summary-item:last-child { text-align: right; }
            .summary-label {
                font-size: 11px;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 4px;
            }
            .summary-value {
                font-size: 28px;
                font-weight: 700;
                letter-spacing: 1px;
            }
            .summary-value.gold { color: #FFD700; }

            /* ── Divider line ── */
            .divider {
                height: 1px;
                background: #333;
            }

            /* ── Column headers ── */
            .col-headers {
                display: flex;
                align-items: center;
                padding: 14px 40px;
                background: #111;
                border-bottom: 1px solid #222;
            }
            .col-name-header {
                width: 380px;
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 2px;
                font-weight: 600;
            }
            .col-header {
                flex: 1;
                text-align: center;
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 2px;
                font-weight: 600;
            }

            /* ── Player rows ── */
            .player-row {
                display: flex;
                align-items: center;
                padding: 0 40px;
                height: 80px;
                background: #141414;
                border-bottom: 1px solid #1a1a1a;
                position: relative;
            }

            /* ── Name column with map background ── */
            .player-name-area {
                width: 380px;
                height: 100%;
                display: flex;
                align-items: center;
                gap: 14px;
                position: relative;
                overflow: hidden;
                margin-left: -40px;
                padding-left: 40px;
            }
            .player-name-area::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-size: cover;
                background-position: center;
                opacity: 0.15;
            }
            .player-name-area > * {
                position: relative;
                z-index: 1;
            }
            .player-level {
                font-size: 13px;
                color: #aaa;
            }
            .player-level .dot {
                display: inline-block;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #888;
                margin-right: 4px;
                vertical-align: middle;
            }
            .player-name {
                font-size: 18px;
                font-weight: 700;
                letter-spacing: 0.5px;
            }

            /* ── Stat columns ── */
            .player-stat {
                flex: 1;
                text-align: center;
                font-size: 20px;
                font-weight: 600;
            }
            .player-stat.highlight {
                color: #FFD700;
            }
        </style>
    </head>
    <body>
        <!-- Summary bar -->
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

        <div class="divider"></div>

        <!-- Column headers -->
        <div class="col-headers">
            <div class="col-name-header">Name</div>
            <div class="col-header">Kills</div>
            <div class="col-header">Damage</div>
            <div class="col-header">Assists</div>
            <div class="col-header">Revives</div>
            <div class="col-header">Time Alive</div>
        </div>

        <!-- Player rows -->
        ${teamMembers.map(member => {
            const stats = member.attributes.stats;
            return `
            <div class="player-row">
                <div class="player-name-area"${mapImage ? ` style="--bg: url('${mapImage}')"` : ''}>
                    <div>
                        <div class="player-name">${stats.name}</div>
                        <div class="player-level"><span class="dot"></span>Lv.${stats.level || 1}</div>
                    </div>
                </div>
                <div class="player-stat">${stats.kills || 0}</div>
                <div class="player-stat highlight">${Math.round(stats.damageDealt || 0)}</div>
                <div class="player-stat">${stats.assists || 0}</div>
                <div class="player-stat">${stats.revives || 0}</div>
                <div class="player-stat">${formatTime(stats.timeSurvived)}</div>
            </div>`;
        }).join('')}
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

            const teamId = playerStats.attributes.stats.teamId;
            const teamMembers = matchData.included.filter(
                item => item.type === 'participant' &&
                item.attributes.stats.teamId === teamId &&
                item.attributes.stats.teamId !== 0
            ).sort((a, b) => {
                const killsDiff = b.attributes.stats.kills - a.attributes.stats.kills;
                if (killsDiff !== 0) return killsDiff;
                return b.attributes.stats.damageDealt - a.attributes.stats.damageDealt;
            });

            const totalParticipants = matchData.included.filter(
                item => item.type === 'participant'
            ).length;

            // Pre-fetch the map image as base64
            const mapName = matchData.data.attributes.mapName;
            const mapImage = await fetchMapImage(mapName);

            const html = generateMatchReportHTML(matchData, playerStats, teamMembers, totalParticipants, mapImage);

            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                timeout: 30000
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 1000, height: 600 });
            await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });

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
