const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const sharp = require('sharp');

// HTML template - this stays in the same file
const HTML_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #1A1A1A;
            font-family: Arial, sans-serif;
            width: 1200px;
        }
        .match-row {
            position: relative;
            height: 95px;
            background: #2A2A2A;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
            padding: 0 20px;
            color: white;
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
            color: #FFD700;
            font-size: 42px;
            font-weight: bold;
            margin-right: 40px;
        }
        .total-players {
            color: #888;
            font-size: 24px;
        }
        .match-info {
            width: 200px;
            margin-right: 40px;
        }
        .time-ago {
            color: #888;
            font-size: 16px;
            margin-bottom: 5px;
        }
        .mode {
            font-size: 20px;
        }
        .game-type {
            width: 150px;
            font-size: 20px;
            margin-right: 40px;
        }
        .stats {
            display: flex;
            gap: 80px;
        }
        .stat {
            text-align: center;
        }
        .stat-value {
            font-size: 24px;
            color: white;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 14px;
            color: #888;
        }
    </style>
</head>
<body>
    {{MATCH_ROWS}}
</body>
</html>
`;

function generateMatchHistoryHTML(matches) {
    const matchRows = matches.map(match => {
        const stats = match.playerStats.attributes.stats;
        const matchInfo = match.matchData.data.attributes;
        const timeSince = getTimeSinceMatch(new Date(matchInfo.createdAt));
        const isWin = stats.winPlace === 1;

        return `
        <div class="match-row">
            ${isWin ? '<div class="win-indicator"></div>' : ''}
            <span class="placement">#${stats.winPlace}<span class="total-players">/${matchInfo.totalParticipants}</span></span>
            <div class="match-info">
                <div class="time-ago">${timeSince}</div>
                <div class="mode">${matchInfo.matchType === 'competitive' ? 'NORMAL' : 'CASUAL MODE'}</div>
            </div>
            <div class="game-type">SQUAD TPP</div>
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
        </div>`;
    }).join('');

    return HTML_TEMPLATE.replace('{{MATCH_ROWS}}', matchRows);
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

            const html = generateMatchHistoryHTML(matches);
            
            // Save the HTML string for debugging if needed
            // console.log(html);

            // Convert HTML to image using Chrome
            const puppeteer = require('puppeteer');
            const browser = await puppeteer.launch();
            const page = await browser.newPage();
            await page.setViewport({ width: 1200, height: matches.length * 100 });
            await page.setContent(html);
            const screenshot = await page.screenshot();
            await browser.close();

            const attachment = new AttachmentBuilder(screenshot, { name: 'match-history.png' });
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error in matchhistory command:', error);
            await interaction.editReply(`Error: ${error.message}`);
        }
    }
};