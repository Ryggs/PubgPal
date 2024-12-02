const { EmbedBuilder } = require('discord.js');
const { formatDuration, formatDistance, formatPercentage, formatKD } = require('./formatters');

function createMatchEmbed(matchData, playerStats, username) {
    const stats = playerStats.attributes.stats;
    return new EmbedBuilder()
        .setColor(stats.winPlace === 1 ? '#FFD700' : '#0099ff')
        .setTitle(`Match Results for ${username}`)
        .setDescription(`${matchData.data.attributes.gameMode} - ${matchData.data.attributes.mapName}`)
        .addFields(
            { name: 'Placement', value: `#${stats.winPlace}${stats.winPlace === 1 ? ' 🏆' : ''}`, inline: true },
            { name: 'Kills', value: stats.kills.toString(), inline: true },
            { name: 'Assists', value: stats.assists.toString(), inline: true },
            { name: 'Damage', value: Math.round(stats.damageDealt).toString(), inline: true },
            { name: 'Survival Time', value: formatDuration(stats.timeSurvived), inline: true },
            { name: 'Distance', value: formatDistance(stats.walkDistance + stats.rideDistance), inline: true },
            { name: 'Headshots', value: stats.headshotKills.toString(), inline: true },
            { name: 'Revives', value: stats.revives.toString(), inline: true },
            { name: 'Heals Used', value: (stats.heals + stats.boosts).toString(), inline: true }
        )
        .setFooter({ text: new Date(matchData.data.attributes.createdAt).toLocaleString() });
}

function createSeasonStatsEmbed(username, stats) {
    return new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Season Stats for ${username}`)
        .addFields(
            { name: 'Rank Points', value: Math.round(stats.rankPoints).toString(), inline: true },
            { name: 'Current Tier', value: `${stats.rankTier} ${stats.rankSubTier}`, inline: true },
            { name: 'Matches', value: stats.roundsPlayed.toString(), inline: true },
            { name: 'Wins', value: stats.wins.toString(), inline: true },
            { name: 'Win Rate', value: formatPercentage(stats.wins / stats.roundsPlayed), inline: true },
            { name: 'K/D Ratio', value: formatKD(stats.kills, stats.roundsPlayed), inline: true },
            { name: 'Avg Damage', value: Math.round(stats.damageDealt / stats.roundsPlayed).toString(), inline: true },
            { name: 'Top 10 Rate', value: formatPercentage(stats.top10Ratio), inline: true }
        );
}

module.exports = {
    createMatchEmbed,
    createSeasonStatsEmbed
};