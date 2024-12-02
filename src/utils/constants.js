module.exports = {
    // API Configuration
    PUBG_API_URL: 'https://api.pubg.com/shards/steam',
    
    // Cache Configuration
    CACHE_TTL: {
        PLAYER: 5 * 60 * 1000,       // 5 minutes
        MATCH: 30 * 60 * 1000,       // 30 minutes
        SEASON: 24 * 60 * 60 * 1000  // 24 hours
    },

    // Command Cooldowns (in milliseconds)
    COOLDOWNS: {
        MATCH_HISTORY: 10 * 1000,    // 10 seconds
        PLAYER_STATS: 30 * 1000,     // 30 seconds
        SEASON_RANK: 60 * 1000       // 1 minute
    },

    // Colors
    COLORS: {
        WIN: '#FFD700',              // Gold
        NORMAL: '#0099ff',           // Blue
        ERROR: '#FF0000'             // Red
    },

    // Game Modes
    GAME_MODES: {
        SOLO: 'solo',
        SOLO_FPP: 'solo-fpp',
        DUO: 'duo',
        DUO_FPP: 'duo-fpp',
        SQUAD: 'squad',
        SQUAD_FPP: 'squad-fpp'
    },

    // Map Names
    MAPS: {
        ERANGEL: 'Erangel',
        MIRAMAR: 'Miramar',
        SANHOK: 'Sanhok',
        VIKENDI: 'Vikendi',
        KARAKIN: 'Karakin',
        PARAMO: 'Paramo',
        HAVEN: 'Haven',
        TAEGO: 'Taego',
        DESTON: 'Deston'
    },

    // Error Messages
    ERRORS: {
        PLAYER_NOT_FOUND: 'Player not found. Please check the username and try again.',
        RATE_LIMIT: 'Rate limit exceeded. Please try again later.',
        API_ERROR: 'Error connecting to PUBG API. Please try again later.',
        INVALID_USERNAME: 'Please provide a valid username.',
        NO_MATCHES: 'No recent matches found for this player.',
        NO_SEASON_STATS: 'No ranked statistics found for this season.'
    }
};