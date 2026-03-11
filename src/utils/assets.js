const PUBG_ASSETS_BASE = 'https://raw.githubusercontent.com/pubg/api-assets/master/Assets';

// Map API identifiers to display names
const MAP_NAMES = {
    'Baltic_Main': 'ERANGEL',
    'Desert_Main': 'MIRAMAR',
    'Savage_Main': 'SANHOK',
    'DihorOtok_Main': 'VIKENDI',
    'Range_Main': 'CAMP JACKAL',
    'Kiki_Main': 'DESTON',
    'Tiger_Main': 'TAEGO',
    'Summerland_Main': 'KARAKIN',
    'Heaven_Main': 'HAVEN',
    'Chimera_Main': 'PARAMO',
    'Neon_Main': 'RONDO'
};

// Map API identifiers to the actual filenames in pubg/api-assets repo
// The repo uses display names like Erangel_Main, not API names like Baltic_Main
const MAP_ASSET_FILENAMES = {
    'Baltic_Main': 'Erangel_Main',
    'Desert_Main': 'Miramar_Main',
    'Savage_Main': 'Sanhok_Main',
    'DihorOtok_Main': 'Vikendi_Main',
    'Range_Main': 'Camp_Jackal_Main',
    'Kiki_Main': 'Deston_Main',
    'Tiger_Main': 'Taego_Main',
    'Summerland_Main': 'Karakin_Main',
    'Heaven_Main': 'Haven_Main',
    'Chimera_Main': 'Paramo_Main',
    'Neon_Main': 'Rondo_Main'
};

function getMapImageUrl(mapName) {
    const filename = MAP_ASSET_FILENAMES[mapName] || mapName;
    return `${PUBG_ASSETS_BASE}/Maps/${filename}_Low_Res.png`;
}

function getMapFullUrl(mapName) {
    const filename = MAP_ASSET_FILENAMES[mapName] || mapName;
    return `${PUBG_ASSETS_BASE}/Maps/${filename}_High_Res.png`;
}

function getWeaponIconUrl(weaponId) {
    return `${PUBG_ASSETS_BASE}/Icons/Item/Weapon/${weaponId}.png`;
}

function getMapDisplayName(mapName) {
    return MAP_NAMES[mapName] || mapName;
}

module.exports = {
    MAP_NAMES,
    getMapImageUrl,
    getMapFullUrl,
    getWeaponIconUrl,
    getMapDisplayName
};
