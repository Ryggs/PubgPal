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

        return `
        <tr style="position: relative;">
            ${isWin ? '<div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #FFD700;"></div>' : ''}
            <td style="width: 150px; padding-left: 20px;">
                <span style="color: #FFD700; font-size: 42px; font-weight: bold;">#${stats.winPlace}</span>
                <span style="color: #888; font-size: 24px;">/64</span>
            </td>
            <td style="width: 200px;">
                <div style="color: #888; font-size: 16px;">${getTimeSinceMatch(new Date(matchInfo.createdAt))}</div>
                <div style="font-size: 20px;">${getGameMode(matchInfo.type)}</div>
            </td>
            <td style="width: 150px; font-size: 20px;">SQUAD TPP</td>
            <td>
                <div style="display: flex; gap: 50px; justify-content: center;">
                    <div style="text-align: center;">
                        <div style="font-size: 24px;">${stats.kills}</div>
                        <div style="font-size: 14px; color: #888;">KILLS</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px;">${stats.assists}</div>
                        <div style="font-size: 14px; color: #888;">ASSISTS</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px;">${Math.round(stats.damageDealt)}</div>
                        <div style="font-size: 14px; color: #888;">DAMAGE</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px;">${formatTime(stats.timeSurvived)}</div>
                        <div style="font-size: 14px; color: #888;">SURVIVAL</div>
                    </div>
                </div>
            </td>
        </tr>`;
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
                font-family: Arial, sans-serif;
                color: white;
            }
            table {
                width: 1200px;
                border-collapse: collapse;
            }
            tr {
                height: 100px;
                background: #2A2A2A;
                border-bottom: 5px solid #1A1A1A;
            }
        </style>
    </head>
    <body>
        <table>${matchRows}</table>
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