const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const puppeteer = require('puppeteer');

function getGameMode(type) {
    switch(type?.toLowerCase()) {
        case 'airoyale': return 'AIR ROYALE';
        case 'arcade': return 'ARCADE';
        case 'official': return 'NORMAL';
        default: return 'CASUAL';
    }
}
function getMapBackgroundUrl(mapName) {
    // Convert map name to the correct key format
    const mapKey = mapName + '_Thumbnail';
    return MAP_ASSETS[mapKey] || MAP_ASSETS[mapName] || '';
}

function generateMatchHistoryHTML(matches) {
    const matchRows = matches.map(match => {
        const stats = match.playerStats.attributes.stats;
        const matchInfo = match.matchData.data.attributes;
        const isWin = stats.winPlace === 1;
        const mapUrl = getMapBackgroundUrl(matchInfo.mapName);

        return `
        <div class="match-row">
            ${isWin ? '<div class="win-indicator"></div>' : ''}
            <div class="map-background" style="background-image: url('${mapUrl}');"></div>
            <div class="match-content">
                <div class="placement">
                    <span class="placement-number">#${stats.winPlace}</span>
                    <span class="total-players">/64</span>
                </div>

                <div class="match-info">
                    <div class="time-ago">${getTimeSinceMatch(new Date(matchInfo.createdAt))}</div>
                    <div class="game-mode">${matchInfo.matchType === 'competitive' ? 'NORMAL' : 'CASUAL MODE'}</div>
                </div>

                <div class="squad-type">SQUAD TPP</div>

                <div class="stats">
                    <div class="stat">
                        <div class="stat-value">${stats.kills}</div>
                        <div class="stat-label">KILLS</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${stats.assists}</div>
                        <div class="stat-label">ASSISTS</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${Math.round(stats.damageDealt)}</div>
                        <div class="stat-label">DAMAGE</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${formatTime(stats.timeSurvived)}</div>
                        <div class="stat-label">SURVIVAL</div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                margin: 0;
                padding: 0;
                background: #1A1A1A;
                font-family: "Segoe UI", Arial, sans-serif;
                color: white;
            }
            .match-row {
                position: relative;
                height: 100px;
                overflow: hidden;
                border-bottom: 2px solid #1A1A1A;
            }
            .map-background {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-size: cover;
                background-position: center;
                opacity: 0.3;
            }
            .match-content {
                position: relative;
                display: flex;
                align-items: center;
                height: 100%;
                padding: 0 20px;
                background: linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 100%);
            }
            .win-indicator {
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
                background: #FFD700;
                z-index: 2;
            }
            .placement {
                width: 180px;
                display: flex;
                align-items: baseline;
            }
            .placement-number {
                color: #FFD700;
                font-size: 42px;
                font-weight: bold;
                margin-right: 5px;
            }
            .total-players {
                color: #888;
                font-size: 24px;
            }
            .match-info {
                width: 220px;
            }
            .time-ago {
                color: #888;
                font-size: 16px;
                margin-bottom: 4px;
            }
            .game-mode {
                font-size: 20px;
                color: white;
            }
            .squad-type {
                width: 180px;
                font-size: 20px;
                color: white;
            }
            .stats {
                display: flex;
                gap: 80px;
                flex: 1;
                justify-content: center;
            }
            .stat {
                text-align: center;
                min-width: 80px;
            }
            .stat-value {
                font-size: 24px;
                color: white;
                margin-bottom: 4px;
            }
            .stat-label {
                font-size: 14px;
                color: #888;
            }
        </style>
    </head>
    <body>
        <div class="match-history">
            ${matchRows}
        </div>
    </body>
    </html>`;
}

function getMapBackground(mapName) {
    return '/api/placeolder/1200/100';
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
        let browser = null;

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

            // Generate HTML
            const html = generateMatchHistoryHTML(matches);

            // Launch browser with specific viewport size
            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setViewport({ 
                width: 1200, 
                height: matches.length * 100 + 10
            });

            // Set content and wait for images to load
            await page.setContent(html);
            await page.evaluate(() => new Promise(resolve => {
                const images = document.querySelectorAll('.map-background');
                if (images.length === 0) resolve();
                let loaded = 0;
                images.forEach(img => {
                    if (img.complete) loaded++;
                    else img.addEventListener('load', () => {
                        loaded++;
                        if (loaded === images.length) resolve();
                    });
                });
                if (loaded === images.length) resolve();
            }));

            const screenshot = await page.screenshot({
                type: 'png',
                fullPage: true
            });

            const attachment = new AttachmentBuilder(Buffer.from(screenshot), { 
                name: 'match-history.png'
            });
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error in matchhistory command:', error);
            await interaction.editReply(`Error: ${error.message}`);
        } finally {
            if (browser) await browser.close();
        }
    }
};