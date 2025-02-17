const MAP_ASSETS = {
    // Full map images
    'Baltic_Main': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Baltic_Main.png',
    'Desert_Main': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Desert_Main.png',
    'Range_Main': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Range_Main.png',
    'Savage_Main': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Savage_Main.png',
    'Kiki_Main': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Kiki_Main.png',
    'Tiger_Main': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Tiger_Main.png',

    // Map thumbnails (for match history)
    'Baltic_Main_Thumbnail': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Thumbnails/Baltic_Main_Thumbnail.png',
    'Desert_Main_Thumbnail': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Thumbnails/Desert_Main_Thumbnail.png',
    'Range_Main_Thumbnail': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Thumbnails/Range_Main_Thumbnail.png',
    'Savage_Main_Thumbnail': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Thumbnails/Savage_Main_Thumbnail.png',
    'Kiki_Main_Thumbnail': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Thumbnails/Kiki_Main_Thumbnail.png',
    'Tiger_Main_Thumbnail': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Maps/Thumbnails/Tiger_Main_Thumbnail.png'
};

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
        // First try to get the thumbnail version
        const thumbnailKey = `${mapName}_Thumbnail`;
        if (MAP_ASSETS[thumbnailKey]) {
            return MAP_ASSETS[thumbnailKey];
        }
        // Fall back to full map if thumbnail not found
        return MAP_ASSETS[mapName] || '';
}
function generateMatchHistoryHTML(matches) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { margin: 0; padding: 0; background: #1A1A1A; font-family: Arial; }
            .row { 
                display: flex; 
                height: 100px; 
                background: #2A2A2A;
                color: white;
                align-items: center;
                padding: 0 20px;
                border-bottom: 2px solid #1A1A1A;
                position: relative;
            }
            .win { border-left: 4px solid #FFD700; }
            .placement { 
                color: #FFD700; 
                font-size: 42px; 
                font-weight: bold;
                width: 180px;
            }
            .info {
                width: 220px;
            }
            .time { 
                color: #888; 
                font-size: 16px;
                margin-bottom: 4px;
            }
            .mode { font-size: 20px; }
            .squad { width: 180px; font-size: 20px; }
            .stats {
                display: grid;
                grid-template-columns: repeat(4, 100px);
                gap: 20px;
                text-align: center;
            }
            .stat-value { font-size: 24px; }
            .stat-label { 
                color: #888; 
                font-size: 14px;
                margin-top: 4px;
            }
        </style>
    </head>
    <body>
        ${matches.map(match => {
            const stats = match.playerStats.attributes.stats;
            const matchInfo = match.matchData.data.attributes;
            return `
            <div class="row ${stats.winPlace === 1 ? 'win' : ''}">
                <div class="placement">#${stats.winPlace}/64</div>
                <div class="info">
                    <div class="time">${getTimeSinceMatch(new Date(matchInfo.createdAt))}</div>
                    <div class="mode">${matchInfo.matchType === 'competitive' ? 'NORMAL' : 'CASUAL MODE'}</div>
                </div>
                <div class="squad">SQUAD TPP</div>
                <div class="stats">
                    <div>
                        <div class="stat-value">${stats.kills}</div>
                        <div class="stat-label">KILLS</div>
                    </div>
                    <div>
                        <div class="stat-value">${stats.assists}</div>
                        <div class="stat-label">ASSISTS</div>
                    </div>
                    <div>
                        <div class="stat-value">${Math.round(stats.damageDealt)}</div>
                        <div class="stat-label">DAMAGE</div>
                    </div>
                    <div>
                        <div class="stat-value">${formatTime(stats.timeSurvived)}</div>
                        <div class="stat-label">SURVIVAL</div>
                    </div>
                </div>
            </div>`;
        }).join('')}
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
            console.log('Starting matchhistory command...');
            const username = interaction.options.getString('username');
            
            // Add timeout to player data fetch
            const playerData = await Promise.race([
                getPUBGPlayer(username),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout getting player data')), 10000)
                )
            ]);

            console.log('Got player data');
            const matchIds = playerData.relationships.matches.data.slice(0, 8);

            // Add timeout to match data fetch
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

            console.log('Got all match data');

            // Generate HTML
            const html = generateMatchHistoryHTML(matches);
            console.log('Generated HTML');

            // Launch browser with timeout
            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                timeout: 10000
            });

            const page = await browser.newPage();
            console.log('Browser page created');

            // Set shorter timeout for page operations
            page.setDefaultTimeout(5000);

            await page.setViewport({ 
                width: 1200, 
                height: matches.length * 100 + 10
            });

            console.log('Setting page content...');
            await page.setContent(html);

            // Take screenshot with timeout
            console.log('Taking screenshot...');
            const screenshot = await Promise.race([
                page.screenshot({
                    type: 'png',
                    fullPage: true
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Screenshot timeout')), 5000)
                )
            ]);

            console.log('Creating attachment...');
            const attachment = new AttachmentBuilder(Buffer.from(screenshot), { 
                name: 'match-history.png'
            });

            console.log('Sending reply...');
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error in matchhistory command:', error);
            await interaction.editReply(`Error generating match history: ${error.message}`);
        } finally {
            if (browser) {
                try {
                    console.log('Closing browser...');
                    await browser.close();
                } catch (error) {
                    console.error('Error closing browser:', error);
                }
            }
        }
    }
};