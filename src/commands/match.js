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
                padding: 0; 
                background: #0A0A0A; 
                font-family: Arial, sans-serif;
                color: white;
                width: 1200px;
                height: 800px;
                position: relative;
                overflow: hidden;
            }
            
            .header {
                position: absolute;
                top: 20px;
                left: 30px;
                font-size: 38px;
                font-weight: bold;
                font-family: 'Arial Black', sans-serif;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .tabs {
                position: absolute;
                top: 80px;
                left: 30px;
                display: flex;
                gap: 2px;
            }
            
            .tab {
                padding: 8px 20px;
                background: #1A1A1A;
                text-transform: uppercase;
                font-size: 14px;
                letter-spacing: 1px;
            }
            
            .tab.active {
                background: #2A2A2A;
                border-bottom: 2px solid #FFD700;
            }
            
            .match-info {
                position: absolute;
                top: 130px;
                left: 30px;
                right: 30px;
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 20px;
            }
            
            .info-item {
                display: flex;
                flex-direction: column;
            }
            
            .info-label {
                color: #666;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
            }
            
            .info-value {
                font-size: 20px;
                color: white;
                font-weight: bold;
                letter-spacing: 1px;
            }
            
            .info-value.bp {
                color: #FFD700;
            }
            
            .player-rows {
                position: absolute;
                top: 200px;
                left: 30px;
                right: 400px;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            
            .player-row {
                height: 70px;
                display: flex;
                align-items: center;
                padding: 0 10px;
                position: relative;
                overflow: hidden;
            }

            .player-row:nth-child(1) { background: linear-gradient(90deg, rgba(255, 107, 107, 0.2), rgba(255, 230, 109, 0.1)); }
            .player-row:nth-child(2) { background: linear-gradient(90deg, rgba(156, 39, 176, 0.2), rgba(103, 58, 183, 0.1)); }
            .player-row:nth-child(3) { background: linear-gradient(90deg, rgba(192, 57, 43, 0.2), rgba(231, 76, 60, 0.1)); }
            .player-row:nth-child(4) { background: linear-gradient(90deg, rgba(22, 160, 133, 0.2), rgba(26, 188, 156, 0.1)); }
            
            .player-info {
                display: flex;
                align-items: center;
                width: 200px;
                gap: 10px;
            }
            
            .player-avatar {
                width: 50px;
                height: 50px;
                background: #333;
                border-radius: 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                position: relative;
            }

            .player-level {
                position: absolute;
                bottom: -5px;
                right: -5px;
                background: #FFD700;
                color: black;
                padding: 2px 4px;
                border-radius: 2px;
                font-size: 10px;
                font-weight: bold;
            }
            
            .player-name {
                font-size: 16px;
                font-weight: bold;
                color: #FFF;
            }
            
            .stats {
                display: flex;
                flex: 1;
                justify-content: space-between;
                padding: 0 20px;
            }
            
            .stat {
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 80px;
            }
            
            .stat-label {
                color: #888;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }
            
            .stat-value {
                font-size: 18px;
                font-weight: bold;
                color: #FFF;
            }

            .player-model {
                position: absolute;
                top: 200px;
                right: 30px;
                width: 350px;
                height: 500px;
                background: url('/api/placeholder/350/500');
                background-size: cover;
            }

            .bottom-buttons {
                position: absolute;
                bottom: 30px;
                left: 30px;
                right: 30px;
                display: flex;
                justify-content: space-between;
            }

            .btn {
                padding: 10px 30px;
                text-transform: uppercase;
                font-size: 14px;
                letter-spacing: 1px;
                background: #333;
                border: none;
                color: white;
                cursor: pointer;
            }

            .btn.ready {
                background: #1A1A1A;
            }

            .btn.cancel {
                background: #DAA520;
            }
        </style>
    </head>
    <body>
        <div class="header">MATCH REPORT</div>
        
        <div class="tabs">
            <div class="tab active">SUMMARY</div>
            <div class="tab">WEAPONS</div>
        </div>
        
        <div class="match-info">
            <div class="info-item">
                <div class="info-label">MAP</div>
                <div class="info-value">${MAP_NAMES[matchData.data.attributes.mapName] || matchData.data.attributes.mapName}</div>
            </div>
            <div class="info-item">
                <div class="info-label">GAME MODE</div>
                <div class="info-value">SQUAD</div>
            </div>
            <div class="info-item">
                <div class="info-label">PLACEMENT</div>
                <div class="info-value">#${playerStats.attributes.stats.winPlace} / ${matchData.data.attributes.totalParticipants}</div>
            </div>
            <div class="info-item">
                <div class="info-label">PHASES SURVIVED</div>
                <div class="info-value">${playerStats.attributes.stats.swimDistance > 0 ? Math.floor(playerStats.attributes.stats.swimDistance / 100) : 0}</div>
            </div>
            <div class="info-item">
                <div class="info-label">SURVIVAL BP EARNED</div>
                <div class="info-value bp">+150</div>
            </div>
        </div>
        
        <div class="player-rows">
            ${teamMembers.map(member => {
                const stats = member.attributes.stats;
                return `
                <div class="player-row">
                    <div class="player-info">
                        <div class="player-avatar">
                            PUBG
                            <div class="player-level">LV.${stats.level || 1}</div>
                        </div>
                        <div class="player-name">${stats.name}</div>
                    </div>
                    <div class="stats">
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
                        <div class="stat">
                            <div class="stat-label">MEDALS</div>
                            <div class="stat-value">${stats.DBNOs || '-'}</div>
                        </div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>

        <div class="player-model"></div>

        <div class="bottom-buttons">
            <button class="btn">BACK</button>
            <div>
                <button class="btn ready">READY</button>
                <button class="btn cancel">CANCEL</button>
            </div>
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
    // You would implement logic here to determine top weapon from stats
    // For now returning placeholder
    return stats.headshotKills > 2 ? 'M416' : 'AKM';
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