const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const puppeteer = require('puppeteer');

// Map name translations
const MAP_NAMES = {
    'Baltic_Main': 'ERANGEL',
    'Desert_Main': 'MIRAMAR',
    'Range_Main': 'SANHOK',
    'Savage_Main': 'VIKENDI',
    'Kiki_Main': 'DESTON',
    'Tiger_Main': 'TAEGO'
};

function generateMatchReportHTML(matchData, playerStats, teamMembers, totalParticipants) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            /* ... (keep existing styles) ... */
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

const { getTopWeapon, analyzeWeaponPerformance, WEAPON_DISPLAY_NAMES } = require('./weaponAnalysis');

// The getTopWeapon function is now imported from weaponAnalysis.js

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
                item.attributes.stats.teamId === teamId &&
                item.attributes.teamId !== 0 //Ensure valid team ID
            ).sort((a, b) =>{
                // Sort by kills (descending) and then by damage (descending)
                const killsDiff = b.attributes.stats.kills - a.attributes.stats.kills;
                if (killsDiff !== 0) return killsDiff;
                return b.attributes.stats.damageDealt - a.attributes.stats.damageDealt;
            });

            // Get total participants in the match
            const totalParticipants = matchData.included.filter(
                item => item.type === 'participant'
            ).length;

            // Generate HTML
            const html = generateMatchReportHTML(
                matchData,
                playerStats, 
                teamMembers,
                totalParticipants);

            // Launch browser
            browser = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                timeout: 10000
            });

            const page = await browser.newPage();
            await page.setViewport({ 
                width: 1200,
                height: Math.max(600, 200 + (teamMembers.length * 80))  // Dynamic height based on team size

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