const { expect } = require('chai');
const sinon = require('sinon');
const { PUBGApi } = require('../src/services/pubgApi');
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
        let api;
        let axiosStub;

        beforeEach(() => {
            axiosStub = sinon.stub();
            api = new PUBGApi();
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should handle player not found', async () => {
            axiosStub.rejects({ response: { status: 404 } });
            try {
                await api.getPUBGPlayer('nonexistentplayer');
            } catch (error) {
                expect(error.message).to.equal('Player not found');
            }
        });
    });
});