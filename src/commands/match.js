const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getPUBGPlayer, getMatchData } = require('../services/pubgApi');
const sharp = require('sharp'); // For converting SVG to PNG
const path = require('path');

// Style definitions and rules
const PLAYER_STYLES = {
    popArt: {
        gradient: ['#FF6B6B', '#FFE66D'],
        pattern: 'dotPattern',
        condition: stats => stats.level >= 300
    },
    neonRays: {
        gradient: ['#9C27B0', '#673AB7'],
        pattern: 'rayPattern',
        condition: stats => stats.damage > 400
    },
    dragonScale: {
        gradient: ['#C0392B', '#E74C3C'],
        pattern: 'scalePattern',
        condition: stats => stats.kills >= 5
    },
    quantumField: {
        gradient: ['#16A085', '#1ABC9C'],
        pattern: 'particlePattern',
        condition: stats => stats.assists > 0
    },
    // Add more styles...
};
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

// Map name translations
const MAP_NAMES = {
    'Baltic_Main': 'ERANGEL',
    'Desert_Main': 'MIRAMAR',
    'Range_Main': 'SANHOK',
    'Savage_Main': 'VIKENDI',
    'Kiki_Main': 'DESTON',
    'Tiger_Main': 'TAEGO'
};
// Weapon icons from API assets
const WEAPON_ICONS = {
// Assault Rifles
'Item_Weapon_M416_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_M416_C.png',
'Item_Weapon_AK47_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_AK47_C.png',
'Item_Weapon_G36C_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_G36C_C.png',
'Item_Weapon_SCAR-L_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_SCAR-L_C.png',
'Item_Weapon_BerylM762_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_BerylM762_C.png',

// SMGs
'Item_Weapon_Vector_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_Vector_C.png',
'Item_Weapon_UMP_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_UMP_C.png',
'Item_Weapon_MP5K_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_MP5K_C.png',

// Sniper Rifles
'Item_Weapon_AWM_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_AWM_C.png',
'Item_Weapon_M24_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_M24_C.png',
'Item_Weapon_Kar98k_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_Kar98k_C.png',

// DMRs
'Item_Weapon_Mini14_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_Mini14_C.png',
'Item_Weapon_SKS_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_SKS_C.png',
'Item_Weapon_SLR_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_SLR_C.png',

// Shotguns
'Item_Weapon_S12K_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_S12K_C.png',
'Item_Weapon_S1897_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_S1897_C.png',

// Pistols
'Item_Weapon_P18C_C': 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets/Items/Weapons/Main/Item_Weapon_P18C_C.png',

};

module.exports = {
    MAP_ASSETS,
    MAP_NAMES,
    WEAPON_ICONS
};

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

            // Generate SVG
            const svg = generateMatchReportSVG(matchData, teamMembers, playerStats);

            // Convert SVG to PNG
            const pngBuffer = await sharp(Buffer.from(svg))
                .png()
                .toBuffer();

            // Send as Discord attachment
            const attachment = new AttachmentBuilder(pngBuffer, { name: 'match-report.png' });
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error in match command:', error);
            await interaction.editReply(`Error: ${error.message}`);
        }
    },
};

function getPlayerStyle(stats) {
    // Find the first matching style based on conditions
    const style = Object.entries(PLAYER_STYLES).find(([_, style]) => style.condition(stats));
    return style ? style[0] : 'default';
}

function generateMatchReportSVG(matchData, teamMembers, playerStats) {
    // Get match info
    const matchInfo = matchData.data.attributes;
    const mapName = MAP_NAMES[matchInfo.mapName] || matchInfo.mapName;
    
    // Start SVG template
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600">
        ${generateSVGDefs()}
        
        <!-- Background -->
        <rect width="1200" height="600" fill="#1A1A1A"/>
        
        <!-- Header -->
        ${generateHeaderSection(matchInfo, playerStats)}
        
        <!-- Players -->
        ${generatePlayerRows(teamMembers)}
    </svg>`;

    return svg;
}

function generateSVGDefs() {
    // Return all gradient and pattern definitions
    return `<defs>
        <!-- Include all the gradient and pattern definitions from our previous SVG -->
        ...
    </defs>`;
}

function generateHeaderSection(matchInfo, playerStats) {
    return `<g transform="translate(0,0)">
        <rect width="1200" height="80" fill="#232323"/>
        <text x="40" y="35" fill="#9a9a9a" font-family="Arial" font-size="16">PLACEMENT</text>
        <text x="40" y="65" fill="#FFD700" font-family="Arial" font-size="24" font-weight="bold" filter="url(#glow)">
            #${playerStats.attributes.stats.winPlace}/${matchInfo.totalParticipants}
        </text>
        ...
    </g>`;
}

function generatePlayerRows(teamMembers) {
    let playerRows = '';
    teamMembers.forEach((member, index) => {
        const stats = member.attributes.stats;
        const style = getPlayerStyle(stats);
        
        playerRows += `
        <g transform="translate(40,${160 + index * 80})">
            <rect width="500" height="70" fill="url(#${style}Gradient)"/>
            <rect width="500" height="70" fill="url(#${PLAYER_STYLES[style].pattern})"/>
            ...
        </g>`;
    });
    return playerRows;
}

// Function to format time (MM:SS)
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}