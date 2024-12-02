/**
 * Format duration from seconds to MM:SS
 */
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Format distance to readable format
 */
function formatDistance(meters) {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${Math.round(meters)}m`;
}

/**
 * Format percentage with given decimal places
 */
function formatPercentage(value, decimals = 1) {
    return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format K/D ratio
 */
function formatKD(kills, matches) {
    return (kills / Math.max(1, matches)).toFixed(2);
}

/**
 * Format date to local string
 */
function formatDate(date) {
    return new Date(date).toLocaleString();
}

/**
 * Format rank tier
 */
function formatRankTier(tier, subTier) {
    return `${tier.charAt(0).toUpperCase() + tier.slice(1)} ${subTier}`;
}

module.exports = {
    formatDuration,
    formatDistance,
    formatPercentage,
    formatKD,
    formatDate,
    formatRankTier
};