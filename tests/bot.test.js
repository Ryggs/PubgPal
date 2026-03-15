const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const { formatDuration, formatDistance } = require('../src/utils/formatters');

describe('PUBG Bot Tests', () => {
    describe('Formatters', () => {
        it('should format duration correctly', () => {
            expect(formatDuration(65)).to.equal('1:05');
            expect(formatDuration(3600)).to.equal('60:00');
        });

        it('should format distance correctly', () => {
            expect(formatDistance(500)).to.equal('500m');
            expect(formatDistance(1500)).to.equal('1.5km');
        });
    });

    describe('PUBG API', () => {
        let axiosGetStub;

        beforeEach(() => {
            axiosGetStub = sinon.stub(axios, 'get');
        });

        afterEach(() => {
            sinon.restore();
            // Clear the require cache so pubgApi re-initializes cleanly
            delete require.cache[require.resolve('../src/services/pubgApi')];
        });

        it('should handle player not found', async () => {
            axiosGetStub.rejects({ response: { status: 404 } });
            const { getPUBGPlayer } = require('../src/services/pubgApi');
            try {
                await getPUBGPlayer('nonexistentplayer');
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error.message).to.equal('Player not found');
            }
        });

        it('should return player data on success', async () => {
            const mockPlayer = { id: 'account.abc123', type: 'player' };
            axiosGetStub.resolves({ data: { data: [mockPlayer] } });
            const { getPUBGPlayer } = require('../src/services/pubgApi');
            const result = await getPUBGPlayer('testplayer');
            expect(result).to.deep.equal(mockPlayer);
        });

        it('should handle rate limiting', async () => {
            axiosGetStub.rejects({ response: { status: 429 } });
            const { getPUBGPlayer } = require('../src/services/pubgApi');
            try {
                await getPUBGPlayer('ratelimitedplayer');
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error.message).to.equal('Rate limit exceeded. Please try again later.');
            }
        });
    });
});
