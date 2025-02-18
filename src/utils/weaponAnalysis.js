const WEAPON_DISPLAY_NAMES = {
    'Item_Weapon_M416_C': 'M416',
    'Item_Weapon_AK47_C': 'AKM',
    'Item_Weapon_G36C_C': 'G36C',
    'Item_Weapon_SCAR-L_C': 'SCAR-L',
    'Item_Weapon_BerylM762_C': 'BERYL',
    'Item_Weapon_Vector_C': 'VECTOR',
    'Item_Weapon_UMP_C': 'UMP45',
    'Item_Weapon_MP5K_C': 'MP5K',
    'Item_Weapon_AWM_C': 'AWM',
    'Item_Weapon_M24_C': 'M24',
    'Item_Weapon_Kar98k_C': 'KAR98K',
    'Item_Weapon_Mini14_C': 'MINI14',
    'Item_Weapon_SKS_C': 'SKS',
    'Item_Weapon_SLR_C': 'SLR',
    'Item_Weapon_S12K_C': 'S12K',
    'Item_Weapon_S1897_C': 'S1897',
    'Item_Weapon_P18C_C': 'P18C'
};

function getTopWeapon(stats) {
    try {
        // Check if we have weapon stats
        if (!stats.weaponStats) {
            return '-';
        }

        // Create an array of weapon usage with damage dealt
        const weaponUsage = Object.entries(stats.weaponStats).map(([weaponId, data]) => {
            return {
                weaponId,
                damage: data.damage || 0,
                kills: data.kills || 0,
                headshots: data.headshots || 0,
                shots: data.shots || 0
            };
        });

        // Sort weapons by a composite score (prioritizing kills and damage)
        weaponUsage.sort((a, b) => {
            // Calculate a score based on multiple factors
            const scoreA = (a.kills * 100) + (a.damage * 0.5) + (a.headshots * 20);
            const scoreB = (b.kills * 100) + (b.damage * 0.5) + (b.headshots * 20);
            return scoreB - scoreA;
        });

        // Get the top weapon
        const topWeapon = weaponUsage[0];
        if (!topWeapon) {
            return '-';
        }

        // Return the display name or the cleaned up weapon ID if no mapping exists
        return WEAPON_DISPLAY_NAMES[topWeapon.weaponId] || 
               topWeapon.weaponId.replace('Item_Weapon_', '').replace('_C', '');
    } catch (error) {
        console.error('Error getting top weapon:', error);
        return '-';
    }
}

// Helper function to analyze weapon performance
function analyzeWeaponPerformance(weaponStats) {
    if (!weaponStats) return null;

    const performance = {
        totalDamage: 0,
        totalKills: 0,
        weapons: {}
    };

    Object.entries(weaponStats).forEach(([weaponId, data]) => {
        performance.totalDamage += data.damage || 0;
        performance.totalKills += data.kills || 0;
        
        performance.weapons[weaponId] = {
            damage: data.damage || 0,
            kills: data.kills || 0,
            headshots: data.headshots || 0,
            accuracy: data.shots ? (data.hits / data.shots * 100).toFixed(1) : 0
        };
    });

    return performance;
}

module.exports = {
    getTopWeapon,
    analyzeWeaponPerformance,
    WEAPON_DISPLAY_NAMES
};