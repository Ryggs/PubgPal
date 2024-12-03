const axios = require('axios');
const { PUBG_API_URL } = require('../utils/constants');
async function getPUBGPlayer(username) {
    try {
        const response = await axios.get(
            `https://api.pubg.com/shards/steam/players?filter[playerNames]=${username}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.PUBG_API_KEY}`,
                    'Accept': 'application/vnd.api+json'
                }
            }
        );

        if (!response.data.data.length) {
            throw new Error(`Player "${username}" not found`);
        }
        return response.data.data[0];
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
    try {
        const response = await axios.get(
            `https://api.pubg.com/shards/steam/matches/${matchId}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.PUBG_API_KEY}`,
                    'Accept': 'application/vnd.api+json'
                }
            }
        );
        return response.data;
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

module.exports = {
    getPUBGPlayer,
    getMatchData
};