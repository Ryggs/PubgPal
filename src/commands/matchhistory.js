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

function generateMatchHistoryHTML(matches) {
    const matchRows = matches.map(match => {
        const stats = match.playerStats.attributes.stats;
        const matchInfo = match.matchData.data.attributes;
        const isWin = stats.winPlace === 1;
        
        // Get appropriate map background based on matchInfo.mapName
        const mapBackground = getMapBackground(matchInfo.mapName);

        return `
        <div class="match-row" style="background-image: url('${mapBackground}');">
            ${isWin ? '<div class="win-indicator"></div>' : ''}
            <div class="match-content">
                <div class="placement">
                    <span class="placement-number">#${stats.winPlace}</span>
                    <span class="total-players">/64</span>
                </div>

                <div class="match-info">
                    <div class="time-ago">${getTimeSinceMatch(new Date(matchInfo.createdAt))}</div>
                    <div class="game-mode">${getGameMode(matchInfo.type)}</div>
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
                background-size: cover;
                background-position: center;
                border-bottom: 2px solid #1A1A1A;
            }
            .match-content {
                display: flex;
                align-items: center;
                height: 100%;
                padding: 0 20px;
                background: linear-gradient(to right, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.6) 100%);
            }
            .win-indicator {
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
                background: #FFD700;
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
            console.log('Getting player data for:', username);
            
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

            console.log('Generating HTML...');
            const html = generateMatchHistoryHTML(matches);

            // Launch browser
            console.log('Launching browser...');
            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            console.log('Setting viewport...');
            await page.setViewport({ 
                width: 1200, 
                height: matches.length * 100 + 10 // Add some padding
            });
            
            console.log('Setting content...');
            await page.setContent(html);
            
            // Take screenshot
            console.log('Taking screenshot...');
            const buffer = await page.screenshot({
                type: 'png',
                fullPage: true,
                encoding: 'binary'
            });

            console.log('Creating attachment...');
            const attachment = new AttachmentBuilder(Buffer.from(buffer), { 
                name: 'match-history.png',
                description: `Match history for ${username}`
            });

            console.log('Sending reply...');
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error in matchhistory command:', error);
            await interaction.editReply(`Error: ${error.message}`);
        } finally {
            if (browser) {
                console.log('Closing browser...');
                await browser.close();
            }
        }
    }
};