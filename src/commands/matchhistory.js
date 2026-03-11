const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const { getMapThumbnailUrl, getMapDisplayName } = require('../utils/assets');
const puppeteer = require('puppeteer');

function generateMatchHistoryHTML(matches) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                background: #111;
                font-family: 'Rajdhani', Arial, sans-serif;
                width: 900px;
            }
            .row {
                display: flex;
                height: 90px;
                color: white;
                align-items: center;
                margin-bottom: 2px;
                position: relative;
                background: #1a1a1a;
            }

            /* Map image area — covers placement + map name zone */
            .map-area {
                width: 230px;
                height: 100%;
                position: relative;
                overflow: hidden;
                flex-shrink: 0;
                background-size: cover;
                background-position: center;
            }
            .map-area::before {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(to right, rgba(0,0,0,0.35), rgba(0,0,0,0.7));
            }
            .map-area-content {
                position: relative;
                z-index: 1;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                padding: 0 18px;
            }
            .placement-line {
                display: flex;
                align-items: baseline;
                gap: 3px;
            }
            .placement-number {
                font-size: 44px;
                font-weight: 700;
                color: #FFD700;
                line-height: 1;
                letter-spacing: -1px;
            }
            .placement-total {
                font-size: 20px;
                font-weight: 500;
                color: rgba(255,255,255,0.5);
            }
            .map-name {
                font-size: 13px;
                font-weight: 600;
                color: rgba(255,255,255,0.7);
                text-transform: uppercase;
                letter-spacing: 1.5px;
                margin-top: 2px;
            }

            .win-bar {
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
                background: #FFD700;
                z-index: 2;
            }

            .match-info {
                width: 170px;
                padding: 0 15px;
                flex-shrink: 0;
            }
            .time-ago {
                color: #555;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 3px;
            }
            .mode {
                font-size: 15px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #ccc;
            }

            .stats {
                display: flex;
                flex: 1;
                justify-content: space-around;
            }
            .stat {
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 70px;
            }
            .stat-value {
                font-size: 24px;
                font-weight: 700;
                color: white;
                line-height: 1.2;
            }
            .stat-label {
                font-size: 10px;
                font-weight: 600;
                color: #555;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
        </style>
    </head>
    <body>
        ${matches.map(match => {
            const stats = match.playerStats.attributes.stats;
            const matchInfo = match.matchData.data.attributes;
            const isWin = stats.winPlace === 1;
            const mapBg = getMapThumbnailUrl(matchInfo.mapName);
            const totalPlayers = match.matchData.included
                ? match.matchData.included.filter(i => i.type === 'participant').length
                : 64;

            return `
            <div class="row">
                ${isWin ? '<div class="win-bar"></div>' : ''}
                <div class="map-area" style="background-image: url('${mapBg}');">
                    <div class="map-area-content">
                        <div class="placement-line">
                            <span class="placement-number">#${stats.winPlace}</span>
                            <span class="placement-total">/${totalPlayers}</span>
                        </div>
                        <div class="map-name">${getMapDisplayName(matchInfo.mapName)}</div>
                    </div>
                </div>
                <div class="match-info">
                    <div class="time-ago">${getTimeSinceMatch(new Date(matchInfo.createdAt))}</div>
                    <div class="mode">${matchInfo.gameMode ? matchInfo.gameMode.toUpperCase() : 'SQUAD TPP'}</div>
                </div>
                <div class="stats">
                    <div class="stat">
                        <div class="stat-value">${stats.kills}</div>
                        <div class="stat-label">Kills</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${stats.assists}</div>
                        <div class="stat-label">Assists</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${Math.round(stats.damageDealt)}</div>
                        <div class="stat-label">Damage</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${formatTime(stats.timeSurvived)}</div>
                        <div class="stat-label">Survived</div>
                    </div>
                </div>
            </div>`;
        }).join('')}
    </body>
    </html>`;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function getTimeSinceMatch(date) {
    const hours = Math.floor((new Date() - date) / (1000 * 60 * 60));
    if (hours < 1) return 'JUST NOW';
    if (hours < 24) {
        return `${hours} HOUR${hours > 1 ? 'S' : ''} AGO`;
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
        let browser = null;

        try {
            const username = interaction.options.getString('username');

            const playerData = await Promise.race([
                getPUBGPlayer(username),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout getting player data')), 10000)
                )
            ]);

            const matchIds = playerData.relationships.matches.data.slice(0, 8);

            const matches = await Promise.all(
                matchIds.map(async match => {
                    const matchData = await Promise.race([
                        getMatchData(match.id),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Timeout getting match data')), 10000)
                        )
                    ]);

                    return {
                        matchData,
                        playerStats: matchData.included.find(
                            item => item.type === 'participant' &&
                            item.attributes.stats.name.toLowerCase() === username.toLowerCase()
                        )
                    };
                })
            );

            const html = generateMatchHistoryHTML(matches);

            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                timeout: 10000
            });

            const page = await browser.newPage();
            page.setDefaultTimeout(5000);

            await page.setViewport({
                width: 900,
                height: matches.length * 92 + 10
            });

            await page.setContent(html, { waitUntil: 'networkidle0', timeout: 10000 });

            const screenshot = await Promise.race([
                page.screenshot({
                    type: 'png',
                    fullPage: true
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Screenshot timeout')), 10000)
                )
            ]);

            const attachment = new AttachmentBuilder(Buffer.from(screenshot), {
                name: 'match-history.png'
            });

            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error in matchhistory command:', error);
            await interaction.editReply(`Error generating match history: ${error.message}`);
        } finally {
            if (browser) {
                try {
                    await browser.close();
                } catch (error) {
                    console.error('Error closing browser:', error);
                }
            }
        }
    }
};
