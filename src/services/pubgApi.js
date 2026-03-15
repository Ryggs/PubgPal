const axios = require('axios');
const { PUBG_API_URL, CACHE_TTL } = require('../utils/constants');
const cache = require('./cache');

const API_HEADERS = {
    'Authorization': `Bearer ${process.env.PUBG_API_KEY}`,
    'Accept': 'application/vnd.api+json'
};

async function getPUBGPlayer(username) {
    const cacheKey = `player:${username.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await axios.get(
            `${PUBG_API_URL}/players?filter[playerNames]=${username}`,
            { headers: API_HEADERS }
        );

        if (!response.data.data.length) {
            throw new Error(`Player "${username}" not found`);
        }
        const player = response.data.data[0];
        cache.set(cacheKey, player, CACHE_TTL.PLAYER);
        return player;
    } catch (error) {
        if (error.response) {
            switch (error.response.status) {
                case 404:
                    throw new Error('Player not found');
                case 429:
                    throw new Error('Rate limit exceeded. Please try again later.');
                case 403:
                    throw new Error('API authentication failed');
                default:
                    throw new Error(`API Error: ${error.response.status}`);
            }
        }
        throw error;
    }
}

async function getMatchData(matchId) {
    const cacheKey = `match:${matchId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await axios.get(
            `${PUBG_API_URL}/matches/${matchId}`,
            { headers: API_HEADERS }
        );
        const matchData = response.data;
        cache.set(cacheKey, matchData, CACHE_TTL.MATCH);
        return matchData;
    } catch (error) {
        if (error.response) {
            switch (error.response.status) {
                case 404:
                    throw new Error('Match not found');
                case 429:
                    throw new Error('Rate limit exceeded. Please try again later.');
                default:
                    throw new Error(`API Error: ${error.response.status}`);
            }
        }
        throw error;
    }
}

async function getCurrentSeason() {
    const cacheKey = 'current-season';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await axios.get(
            `${PUBG_API_URL}/seasons`,
            { headers: API_HEADERS }
        );
        const seasons = response.data.data;
        const currentSeason = seasons.find(s => s.attributes.isCurrentSeason);
        if (!currentSeason) {
            throw new Error('Could not determine current season');
        }
        cache.set(cacheKey, currentSeason, CACHE_TTL.SEASON);
        return currentSeason;
    } catch (error) {
        if (error.response) {
            switch (error.response.status) {
                case 429:
                    throw new Error('Rate limit exceeded. Please try again later.');
                default:
                    throw new Error(`API Error: ${error.response.status}`);
            }
        }
        throw error;
    }
}

async function getPlayerSeasonStats(playerId, seasonId) {
    const cacheKey = `season-stats:${playerId}:${seasonId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await axios.get(
            `${PUBG_API_URL}/players/${playerId}/seasons/${seasonId}/ranked`,
            { headers: API_HEADERS }
        );
        const stats = response.data;
        cache.set(cacheKey, stats, CACHE_TTL.PLAYER);
        return stats;
    } catch (error) {
        if (error.response) {
            switch (error.response.status) {
                case 404:
                    throw new Error('No ranked statistics found for this season.');
                case 429:
                    throw new Error('Rate limit exceeded. Please try again later.');
                default:
                    throw new Error(`API Error: ${error.response.status}`);
            }
        }
        throw error;
    }
}

async function getPlayerAccountStats(playerId, seasonId) {
    const cacheKey = `account-stats:${playerId}:${seasonId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await axios.get(
            `${PUBG_API_URL}/players/${playerId}/seasons/${seasonId}`,
            { headers: API_HEADERS }
        );
        const stats = response.data;
        cache.set(cacheKey, stats, CACHE_TTL.PLAYER);
        return stats;
    } catch (error) {
        if (error.response && error.response.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
        return null;
    }
}

async function getSurvivalMastery(playerId) {
    const cacheKey = `survival-mastery:${playerId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await axios.get(
            `${PUBG_API_URL}/players/${playerId}/survival_mastery`,
            { headers: API_HEADERS }
        );
        const data = response.data;
        cache.set(cacheKey, data, CACHE_TTL.PLAYER);
        return data;
    } catch (error) {
        if (error.response && error.response.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
        return null;
    }
}

// Start periodic cache cleanup
cache.startCleanup();

module.exports = {
    getPUBGPlayer,
    getMatchData,
    getCurrentSeason,
    getPlayerSeasonStats,
    getPlayerAccountStats,
    getSurvivalMastery
};