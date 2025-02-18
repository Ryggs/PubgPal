const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const puppeteer = require('puppeteer');

const MAP_NAMES = {
    'Baltic_Main': 'ERANGEL',
    'Desert_Main': 'MIRAMAR',
    'Range_Main': 'SANHOK',
    'Savage_Main': 'VIKENDI',
    'Kiki_Main': 'DESTON',
    'Tiger_Main': 'TAEGO'
};

function generateMatchReportHTML(matchData, playerStats, teamMembers) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { 
                margin: 0; 
                padding: 30px; 
                background: #0A0A0A; 
                font-family: 'Tahoma', sans-serif;
                color: white;
                width: 1200px;
                height: 800px;
            }
            
            .title {
                font-size: 42px;
                font-weight: bold;
                text-transform: uppercase;
                margin-bottom: 20px;
                font-family: 'Impact', sans-serif;
                letter-spacing: 1px;
            }
            
            .tabs {
                display: flex;
                gap: 2px;
                margin-bottom: 30px;
            }
            
            .tab {
                padding: 8px 24px;
                font-size: 14px;
                text-transform: uppercase;
                background: rgba(255, 255, 255, 0.1);
            }
            
            .tab.active {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .match-summary {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 40px;
                margin-bottom: 30px;
            }
            
            .summary-item {
                display: flex;
                flex-direction: column;
            }
            
            .summary-label {
                font-size: 12px;
                color: #888;
                text-transform: uppercase;
                margin-bottom: 5px;
                letter-spacing: 1px;
            }
            
            .summary-value {
                font-size: 24px;
                font-weight: bold;
                letter-spacing: 1px;
            }
            
            .summary-value.bp {
                color: #FFD700;
            }
            
            .player-rows {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            
            .player-row {
                height: 80px;
                display: flex;
                align-items: center;
                background: linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 100%);
                position: relative;
                overflow: hidden;
            }

            .player-banner {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 1;
            }

            .player-row:nth-child(1) .player-banner {
                background: linear-gradient(90deg, rgba(255,107,107,0.2), rgba(255,230,109,0.1));
            }

            .player-row:nth-child(2) .player-banner {
                background: linear-gradient(90deg, rgba(0,150,255,0.2), rgba(0,75,255,0.1));
            }

            .player-row:nth-child(3) .player-banner {
                background: linear-gradient(90deg, rgba(255,128,0,0.2), rgba(180,90,0,0.1));
            }

            .player-row:nth-child(4) .player-banner {
                background: linear-gradient(90deg, rgba(255,128,128,0.2), rgba(180,90,90,0.1));
            }
            
            .player-content {
                display: flex;
                align-items: center;
                width: 100%;
                z-index: 2;
                padding: 0 20px;
            }
            
            .player-info {
                display: flex;
                align-items: center;
                width: 300px;
                gap: 15px;
            }
            
            .player-avatar {
                width: 60px;
                height: 60px;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .pubg-icon {
                width: 40px;
                height: 40px;
                background: #555;
                border-radius: 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                color: #fff;
            }
            
            .player-level {
                position: absolute;
                bottom: 0;
                left: 0;
                background: #FFD700;
                color: black;
                padding: 2px 6px;
                font-size: 12px;
                font-weight: bold;
            }
            
            .player-name {
                font-size: 18px;
                font-weight: bold;
            }
            
            .player-stats {
                display: flex;
                flex: 1;
                justify-content: space-between;
                padding-right: 20px;
            }
            
            .stat {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100px;
            }
            
            .stat-label {
                font-size: 12px;
                color: #888;
                text-transform: uppercase;
                margin-bottom: 4px;
            }
            
            .stat-value {
                font-size: 20px;
                font-weight: bold;
            }

            .medals {
                width: 120px;
                display: flex;
                justify-content: flex-end;
                gap: 5px;
            }

            .medal {
                width: 30px;
                height: 30px;
                background: rgba(255,255,255,0.1);
                border-radius: 50%;
            }
        </style>
    </head>
    <body>
        <div class="title">MATCH REPORT</div>
        
        <div class="tabs">
            <div class="tab active">SUMMARY</div>
            <div class="tab">WEAPONS</div>
        </div>
        
        <div class="match-summary">
            <div class="summary-item">
                <div class="summary-label">MAP</div>
                <div class="summary-value">${MAP_NAMES[matchData.data.attributes.mapName] || matchData.data.attributes.mapName}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">GAME MODE</div>
                <div class="summary-value">SQUAD</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">PLACEMENT</div>
                <div class="summary-value">#${playerStats.attributes.stats.winPlace} / ${matchData.data.attributes.totalParticipants}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">PHASES SURVIVED</div>
                <div class="summary-value">0</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">SURVIVAL BP EARNED</div>
                <div class="summary-value bp">+150</div>
            </div>
        </div>
        
        <div class="player-rows">
            ${teamMembers.map(member => {
                const stats = member.attributes.stats;
                return `
                <div class="player-row">
                    <div class="player-banner"></div>
                    <div class="player-content">
                        <div class="player-info">
                            <div class="player-avatar">
                                <div class="pubg-icon">PUBG</div>
                                <div class="player-level">LV.${stats.level || 1}</div>
                            </div>
                            <div class="player-name">${stats.name}</div>
                        </div>
                        <div class="player-stats">
                            <div class="stat">
                                <div class="stat-label">KILLS</div>
                                <div class="stat-value">${stats.kills}</div>
                            </div>
                            <div class="stat">
                                <div class="stat-label">ASSISTS</div>
                                <div class="stat-value">${stats.assists}</div>
                            </div>
                            <div class="stat">
                                <div class="stat-label">DAMAGE</div>
                                <div class="stat-value">${Math.round(stats.damageDealt)}</div>
                            </div>
                            <div class="stat">
                                <div class="stat-label">TIME ALIVE</div>
                                <div class="stat-value">${formatTime(stats.timeSurvived)}</div>
                            </div>
                            <div class="stat">
                                <div class="stat-label">TOP WEAPON</div>
                                <div class="stat-value">${getTopWeapon(stats)}</div>
                            </div>
                        </div>
                        <div class="medals">
                            ${getMedalIcons(stats)}
                        </div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    </body>
    </html>
    `;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function getTopWeapon(stats) {
    // In a real implementation, you would analyze the weapon usage stats
    // For now, returning placeholder values
    const weapons = ['M416', 'AKM', 'AWM', 'M24'];
    return weapons[Math.floor(Math.random() * weapons.length)];
}

function getMedalIcons(stats) {
    // Calculate number of medals based on performance
    const numMedals = Math.min(Math.floor(stats.kills / 2 + stats.assists / 2), 3);
    return Array(numMedals).fill('<div class="medal"></div>').join('');
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
            
            // Get player and match data
            const playerData = await getPUBGPlayer(username);
            const latestMatchId = playerData.relationships.matches.data[0].id;
            const matchData = await getMatchData(latestMatchId);

            // Get team data
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
                item.attributes.stats.teamId === teamId
            );

            // Generate HTML
            const html = generateMatchReportHTML(matchData, playerStats, teamMembers);

            // Launch browser
            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                timeout: 10000
            });

            const page = await browser.newPage();
            await page.setViewport({ 
                width: 1200,
                height: 800
            });

            // Set content and wait for rendering
            await page.setContent(html);
            await page.waitForSelector('.player-rows');

            // Take screenshot
            const screenshot = await page.screenshot({
                type: 'png',
                fullPage: true
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