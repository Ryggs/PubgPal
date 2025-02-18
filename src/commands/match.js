const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const puppeteer = require('puppeteer');

// Constants
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
                padding: 20px; 
                background: #1A1A1A; 
                font-family: Arial, sans-serif;
                color: white;
            }
            
            .header {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 20px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .tab {
                padding: 8px 20px;
                background: #2A2A2A;
                cursor: pointer;
                text-transform: uppercase;
                font-size: 14px;
                letter-spacing: 1px;
            }
            
            .tab.active {
                background: #3A3A3A;
            }
            
            .match-info {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
                margin-bottom: 30px;
                background: #2A2A2A;
                padding: 20px;
                border-radius: 4px;
            }
            
            .info-item {
                display: flex;
                flex-direction: column;
            }
            
            .info-label {
                color: #888;
                font-size: 14px;
                text-transform: uppercase;
                margin-bottom: 5px;
                letter-spacing: 0.5px;
            }
            
            .info-value {
                font-size: 24px;
                color: white;
                font-weight: bold;
            }
            
            .info-value.bp {
                color: #FFD700;
            }
            
            .player-rows {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            
            .player-row {
                display: flex;
                align-items: center;
                background: #2A2A2A;
                height: 80px;
                padding: 0 20px;
                position: relative;
                overflow: hidden;
            }
            
            .player-row.winner::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
                background: #FFD700;
            }
            
            .player-info {
                display: flex;
                align-items: center;
                width: 200px;
            }
            
            .level-badge {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #FFD700, #FFA500);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 10px;
                font-weight: bold;
                font-size: 12px;
                color: #1A1A1A;
            }
            
            .player-name {
                font-size: 16px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
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
                width: 100px;
            }
            
            .stat-label {
                color: #888;
                font-size: 12px;
                text-transform: uppercase;
                margin-bottom: 5px;
                letter-spacing: 0.5px;
            }
            
            .stat-value {
                font-size: 20px;
                font-weight: bold;
            }
            
            .buttons {
                display: flex;
                justify-content: space-between;
                margin-top: 20px;
            }
            
            .btn {
                padding: 10px 30px;
                background: #2A2A2A;
                border: none;
                color: white;
                text-transform: uppercase;
                cursor: pointer;
                font-size: 14px;
                letter-spacing: 1px;
                transition: background-color 0.2s;
            }
            
            .btn:hover {
                background: #3A3A3A;
            }
            
            .btn.cancel {
                background: #B8860B;
            }
            
            .btn.cancel:hover {
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
                <div class="info-label">SURVIVAL BP EARNED</div>
                <div class="info-value bp">+150</div>
            </div>
        </div>
        
        <div class="player-rows">
            ${teamMembers.map(member => {
                const stats = member.attributes.stats;
                const isWinner = stats.winPlace === 1;
                return `
                <div class="player-row ${isWinner ? 'winner' : ''}">
                    <div class="player-info">
                        <div class="level-badge">
                            LV.${stats.level || 1}
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
                            <div class="stat-value">${stats.killStreaks || '-'}</div>
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
        
        <div class="buttons">
            <button class="btn">BACK</button>
            <div>
                <button class="btn">READY</button>
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