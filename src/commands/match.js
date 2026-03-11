const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const puppeteer = require('puppeteer');
const { getTopWeapon } = require('../utils/weaponAnalysis');
const { getMapDisplayName, getMapThumbnailUrl } = require('../utils/assets');

function calculatePhasesSurvived(stats) {
    if (!stats || !stats.timeSurvived) return 0;
    return Math.floor(stats.timeSurvived / 300);
}

function formatTime(seconds) {
    if (!seconds) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function generateMatchReportHTML(matchData, playerStats, teamMembers, totalParticipants) {
    const mapName = matchData.data.attributes.mapName;
    const gameMode = matchData.data.attributes.gameMode || 'squad';
    const matchType = matchData.data.attributes.matchType;
    const pStats = playerStats.attributes.stats;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                width: 800px;
                background: #0A0A0A;
                font-family: 'Rajdhani', Arial, sans-serif;
                color: white;
            }

            .map-banner {
                height: 140px;
                background-size: cover;
                background-position: center;
                position: relative;
                display: flex;
                align-items: flex-end;
                padding: 15px 25px;
            }
            .map-banner::before {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(transparent 20%, rgba(10,10,10,0.9));
            }
            .banner-content {
                position: relative;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                width: 100%;
            }
            .banner-title {
                font-size: 28px;
                font-weight: 700;
                letter-spacing: 3px;
            }
            .banner-meta {
                font-size: 16px;
                color: #aaa;
                letter-spacing: 1px;
            }

            .match-summary {
                display: flex;
                background: #141414;
                border-bottom: 1px solid #222;
            }
            .summary-item {
                flex: 1;
                padding: 16px 20px;
                border-right: 1px solid #222;
            }
            .summary-item:last-child { border-right: none; }
            .summary-label {
                color: #666;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                margin-bottom: 4px;
            }
            .summary-value {
                font-size: 22px;
                font-weight: 700;
                color: white;
            }
            .summary-value.gold { color: #FFD700; }

            .team-header {
                display: flex;
                padding: 12px 25px;
                background: #111;
                border-bottom: 1px solid #222;
            }
            .team-header .col-name { width: 200px; }
            .team-header .col { flex: 1; text-align: center; color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }

            .player-row {
                display: flex;
                align-items: center;
                padding: 14px 25px;
                background: #141414;
                border-bottom: 1px solid #1a1a1a;
            }
            .player-row.self {
                background: #1a1a0a;
                border-left: 3px solid #FFD700;
            }
            .player-name-col {
                width: 200px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .player-name {
                font-size: 16px;
                font-weight: 600;
            }
            .player-stat {
                flex: 1;
                text-align: center;
                font-size: 18px;
                font-weight: 600;
            }
            .player-stat.kills { color: #ff6b6b; }
        </style>
    </head>
    <body>
        <div class="map-banner" style="background-image: url('${getMapThumbnailUrl(mapName)}');">
            <div class="banner-content">
                <div>
                    <div class="banner-title">MATCH REPORT</div>
                    <div class="banner-meta">${getMapDisplayName(mapName)} &bull; ${gameMode.toUpperCase()} &bull; ${matchType === 'competitive' ? 'RANKED' : 'NORMAL'}</div>
                </div>
                <div class="banner-meta">${formatTime(pStats.timeSurvived)} played</div>
            </div>
        </div>

        <div class="match-summary">
            <div class="summary-item">
                <div class="summary-label">Placement</div>
                <div class="summary-value gold">#${pStats.winPlace} / ${totalParticipants}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Kills</div>
                <div class="summary-value">${pStats.kills}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Damage</div>
                <div class="summary-value">${Math.round(pStats.damageDealt)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Phases Survived</div>
                <div class="summary-value">${calculatePhasesSurvived(pStats)}</div>
            </div>
        </div>

        <div class="team-header">
            <div class="col-name" style="color:#555; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Player</div>
            <div class="col">Kills</div>
            <div class="col">Assists</div>
            <div class="col">Damage</div>
            <div class="col">Survived</div>
            <div class="col">Top Weapon</div>
        </div>

        ${teamMembers.map(member => {
            const stats = member.attributes.stats;
            const isSelf = stats.name.toLowerCase() === pStats.name.toLowerCase();
            return `
            <div class="player-row${isSelf ? ' self' : ''}">
                <div class="player-name-col">
                    <div class="player-name">${stats.name}</div>
                </div>
                <div class="player-stat kills">${stats.kills || 0}</div>
                <div class="player-stat">${stats.assists || 0}</div>
                <div class="player-stat">${Math.round(stats.damageDealt || 0)}</div>
                <div class="player-stat">${formatTime(stats.timeSurvived)}</div>
                <div class="player-stat">${getTopWeapon(stats)}</div>
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

            const html = generateMatchReportHTML(matchData, playerStats, teamMembers, totalParticipants);

            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                timeout: 30000
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 800, height: 600 });
            await page.setContent(html, { waitUntil: 'networkidle0', timeout: 10000 });

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
