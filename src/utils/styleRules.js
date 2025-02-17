const STYLES = {
    // High-level player style
    popArt: {
        name: 'popArt',
        gradient: ['#FF6B6B', '#FFE66D'],
        pattern: 'dotPattern',
        condition: stats => stats.level >= 300
    },

    // Aggressive player style
    dragonScale: {
        name: 'dragonScale',
        gradient: ['#C0392B', '#E74C3C'],
        pattern: 'scalePattern',
        condition: stats => stats.kills >= 5 || stats.damageDealt > 400
    },

    // Support player style
    quantum: {
        name: 'quantum',
        gradient: ['#16A085', '#1ABC9C'],
        pattern: 'particlePattern',
        condition: stats => stats.assists >= 2 || stats.revives >= 2
    },

    // Veteran player style
    cyber: {
        name: 'cyber',
        gradient: ['#004D40', '#00897B'],
        pattern: 'gridPattern',
        condition: stats => stats.wins > 100
    },

    // Default style for new players
    default: {
        name: 'default',
        gradient: ['#2C3E50', '#34495E'],
        pattern: 'weavePattern',
        condition: () => true // Always matches if no other style matches
    }
};

// Function to determine player's style based on their stats
function getPlayerStyle(stats) {
    // Check each style in priority order
    for (const [styleName, style] of Object.entries(STYLES)) {
        if (style.condition(stats)) {
            return style;
        }
    }
    
    // Fallback to default style (should never happen due to default's condition)
    return STYLES.default;
}

// Special style rules for achievements
const ACHIEVEMENT_STYLES = {
    // Winning match style
    winner: {
        gradient: ['#FFD700', '#FFA500'],
        pattern: 'starPattern',
        glow: true
    },
    
    // High damage style
    highDamage: {
        gradient: ['#8E44AD', '#9B59B6'],
        pattern: 'explosionPattern',
        glow: true
    },
    
    // Perfect survival style (no damage taken)
    perfect: {
        gradient: ['#3498DB', '#2980B9'],
        pattern: 'shieldPattern',
        glow: true
    }
};

// Function to check for special achievements in a match
function checkAchievements(stats) {
    const achievements = [];
    
    if (stats.winPlace === 1) {
        achievements.push('winner');
    }
    if (stats.damageDealt > 1000) {
        achievements.push('highDamage');
    }
    if (stats.damageReceived === 0 && stats.timeSurvived > 600) { // 10 minutes
        achievements.push('perfect');
    }
    
    return achievements;
}

module.exports = {
    STYLES,
    getPlayerStyle,
    ACHIEVEMENT_STYLES,
    checkAchievements
};