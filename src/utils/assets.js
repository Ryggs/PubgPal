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

function getMapThumbnailUrl(mapName) {
    return `${PUBG_ASSETS_BASE}/Maps/Thumbnails/${mapName}_Thumbnail.png`;
}

function getMapFullUrl(mapName) {
    return `${PUBG_ASSETS_BASE}/Maps/${mapName}.png`;
}

function getWeaponIconUrl(weaponId) {
    return `${PUBG_ASSETS_BASE}/Icons/Item/Weapon/${weaponId}.png`;
}

function getMapDisplayName(mapName) {
    return MAP_NAMES[mapName] || mapName;
}

module.exports = {
    MAP_NAMES,
    getMapThumbnailUrl,
    getMapFullUrl,
    getWeaponIconUrl,
    getMapDisplayName
};
