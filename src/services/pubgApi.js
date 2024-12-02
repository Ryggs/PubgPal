const axios = require('axios');
const { PUBG_API_URL } = require('../utils/constants');

class PUBGApi {
    constructor() {
        this.api = axios.create({
            baseURL: PUBG_API_URL,
            headers: {
                'Authorization': `Bearer ${process.env.PUBG_API_KEY}`,
                'Accept': 'application/vnd.api+json'
            }
        });
    }

    async getPUBGPlayer(username) {
        try {
            const response = await this.api.get(`/players?filter[playerNames]=${username}`);
            if (!response.data.data.length) {
                throw new Error('Player not found');
            }
            return response.data.data[0];
        } catch (error) {
            this.handleApiError(error);
        }
    }

    async getMatchData(matchId) {
        try {
            const response = await this.api.get(`/matches/${matchId}`);
            return response.data;
        } catch (error) {
            this.handleApiError(error);
        }
    }

    async getCurrentSeason() {
        try {
            const response = await this.api.get('/seasons');
            return response.data.data.find(season => season.attributes.isCurrentSeason);
        } catch (error) {
            this.handleApiError(error);
        }
    }

    async getPlayerSeasonStats(playerId, seasonId) {
        try {
            const response = await this.api.get(`/players/${playerId}/seasons/${seasonId}/ranked`);
            return response.data;
        } catch (error) {
            this.handleApiError(error);
        }
    }

    handleApiError(error) {
        if (error.response) {
            switch (error.response.status) {
                case 404:
                    throw new Error('Resource not found');
                case 429:
                    throw new Error('Rate limit exceeded. Please try again later.');
                case 401:
                    throw new Error('API authentication failed');
                case 503:
                    throw new Error('PUBG API is currently unavailable');
                default:
                    throw new Error(`API Error: ${error.response.status}`);
            }
        }
        throw error;
    }
}

module.exports = new PUBGApi();