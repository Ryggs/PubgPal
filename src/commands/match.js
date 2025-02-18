const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const puppeteer = require('puppeteer');
const { getTopWeapon } = require('./weaponAnalysis');

// Map name translations
const MAP_NAMES = {
    'Baltic_Main': 'ERANGEL',
    'Desert_Main': 'MIRAMAR',
    'Range_Main': 'SANHOK',
    'Savage_Main': 'VIKENDI',
    'Kiki_Main': 'DESTON',
    'Tiger_Main': 'TAEGO'
};

function calculatePhasesSurvived(stats) {
    if (!stats || !stats.timeSurvived) return 0;
    return Math.floor(stats.timeSurvived / 300); // Assuming each phase is roughly 5 minutes
}

function formatTime(seconds) {
    if (!seconds) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function generateMatchReportHTML(matchData, playerStats, teamMembers, totalParticipants) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { 
                margin: 0; 
                padding: 20px; 
                background: #0A0A0A; 
                font-family: 'Arial', sans-serif;
                color: white;
            }
            
            .title {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 20px;
            }
            
            .tabs {
                display: flex;
                gap: 2px;
                margin-bottom: 20px;
            }
            
            .tab {
                padding: 8px 20px;
                background: #1A1A1A;
                cursor: pointer;
            }
            
            .tab.active {
                background: #2A2A2A;
            }
            
            .match-info {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 20px;
                margin-bottom: 30px;
                background: #1A1A1A;
                padding: 20px;
            }
            
            .info-item {
                display: flex;
                flex-direction: column;
            }
            
            .info-label {
                color: #666;
                font-size: 14px;
                text-transform: uppercase;
                margin-bottom: 5px;
            }
            
            .info-value {
                font-size: 24px;
                color: white;
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
                background: #1A1A1A;
                padding: 10px 20px;
            }
            
            .player-info {
                display: flex;
                align-items: center;
                width: 200px;
                gap: 10px;
            }
            
            .player-level {
                background: #FFD700;
                color: black;
                padding: 2px 6px;
                border-radius: 2px;
                font-size: 12px;
                font-weight: bold;
            }
            
            .player-stats {
                display: flex;
                flex: 1;
                justify-content: space-between;
            }
            
            .stat {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100px;
            }
            
            .stat-label {
                color: #666;
                font-size: 12px;
                text-transform: uppercase;
                margin-bottom: 4px;
            }
            
            .stat-value {
                font-size: 20px;
                color: white;
            }
        </style>
    </head>
    <body>
        <div class="title">MATCH REPORT</div>
        
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
                <div class="info-value">${matchData.data.attributes.gameMode.toUpperCase()}</div>
            </div>
            <div class="info-item">
                <div class="info-label">PLACEMENT</div>
                <div class="info-value">#${playerStats.attributes.stats.winPlace} / ${totalParticipants}</div>
            </div>
            <div class="info-item">
                <div class="info-label">PHASES SURVIVED</div>
                <div class="info-value">${calculatePhasesSurvived(playerStats.attributes.stats)}</div>
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
                        <div class="player-level">LV.${stats.level || 1}</div>
                        <div class="player-name">${stats.name}</div>
                    </div>
                    <div class="player-stats">
                        <div class="stat">
                            <div class="stat-label">KILLS</div>
                            <div class="stat-value">${stats.kills || 0}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">ASSISTS</div>
                            <div class="stat-value">${stats.assists || 0}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">DAMAGE</div>
                            <div class="stat-value">${Math.round(stats.damageDealt || 0)}</div>
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
                </div>
                `;
            }).join('')}
        </div>
    </body>
    </html>
    `;
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
            
            console.log('Getting player data for:', username);
            const playerData = await getPUBGPlayer(username);
            
            console.log('Getting match data');
            const latestMatchId = playerData.relationships.matches.data[0].id;
            const matchData = await getMatchData(latestMatchId);

            console.log('Finding player stats');
            const playerStats = matchData.included.find(
                item => item.type === 'participant' && 
                item.attributes.stats.name.toLowerCase() === username.toLowerCase()
            );

            if (!playerStats) {
                return await interaction.editReply('No match data found for this player.');
            }

            console.log('Getting team members');
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

            console.log('Generating HTML');
            const html = generateMatchReportHTML(matchData, playerStats, teamMembers, totalParticipants);

            console.log('Launching browser');
            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                timeout: 30000
            });

            console.log('Creating page');
            const page = await browser.newPage();
            await page.setViewport({ 
                width: 1200,
                height: Math.max(600, 200 + (teamMembers.length * 80))
            });

            console.log('Setting content');
            await page.setContent(html);
            
            console.log('Waiting for selector');
            await page.waitForSelector('.player-rows', { timeout: 5000 });

            console.log('Taking screenshot');
            const screenshot = await page.screenshot({
                type: 'png',
                fullPage: true
            });

            console.log('Creating attachment');
            const attachment = new AttachmentBuilder(Buffer.from(screenshot), { 
                name: 'match-report.png'
            });

            console.log('Sending reply');
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error in match command:', error);
            await interaction.editReply(`Error: ${error.message}\nStack: ${error.stack}`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    },
};