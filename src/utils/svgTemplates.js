const SVG_DEFS = `
<defs>
    <!-- Pop Art Style -->
    <linearGradient id="popArtGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#FF6B6B"/>
        <stop offset="100%" style="stop-color:#FFE66D"/>
    </linearGradient>
    <pattern id="dotPattern" patternUnits="userSpaceOnUse" width="20" height="20">
        <circle cx="10" cy="10" r="3" fill="rgba(255,255,255,0.2)"/>
    </pattern>

    <!-- Cyber Grid Style -->
    <linearGradient id="cyberGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#004D40"/>
        <stop offset="100%" style="stop-color:#00897B"/>
    </linearGradient>
    <pattern id="gridPattern" patternUnits="userSpaceOnUse" width="30" height="30">
        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    </pattern>

    <!-- More style definitions... -->

    <!-- Glow Effect -->
    <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
        </feMerge>
    </filter>
</defs>`;

// Generate header section of match report
function generateHeader(matchInfo, playerStats) {
    return `
    <g transform="translate(0,0)">
        <rect width="1200" height="80" fill="#232323"/>
        <text x="40" y="35" fill="#9a9a9a" font-family="Arial" font-size="16">PLACEMENT</text>
        <text x="40" y="65" fill="#FFD700" font-family="Arial" font-size="24" font-weight="bold" filter="url(#glow)">
            #${playerStats.attributes.stats.winPlace}/${matchInfo.totalParticipants}
        </text>
        
        <text x="300" y="35" fill="#9a9a9a" font-family="Arial" font-size="16">MAP</text>
        <text x="300" y="65" fill="#ffffff" font-family="Arial" font-size="24">
            ${matchInfo.mapName}
        </text>
        
        <text x="600" y="35" fill="#9a9a9a" font-family="Arial" font-size="16">MATCH TYPE</text>
        <text x="600" y="65" fill="#ffffff" font-family="Arial" font-size="24">
            ${matchInfo.matchType === 'competitive' ? 'RANKED' : 'CASUAL MODE'} | ${matchInfo.gameMode.toUpperCase()} TPP
        </text>
        
        <text x="1000" y="35" fill="#9a9a9a" font-family="Arial" font-size="16">PLAY TIME</text>
        <text x="1000" y="65" fill="#ffffff" font-family="Arial" font-size="24">
            ${formatTime(playerStats.attributes.stats.timeSurvived)}
        </text>
    </g>`;
}

// Generate player row with nameplate
function generatePlayerRow(player, index, style) {
    const stats = player.attributes.stats;
    return `
    <g transform="translate(40,${160 + index * 80})">
        <!-- Nameplate background -->
        <rect width="500" height="70" fill="url(#${style}Gradient)"/>
        <rect width="500" height="70" fill="url(#${style}Pattern)"/>
        
        <!-- Level badge -->
        <circle cx="35" cy="35" r="25" fill="#2f3136"/>
        <text x="35" y="40" fill="white" font-family="Arial" font-size="14" text-anchor="middle">
            ${stats.level || '1'}
        </text>
        
        <!-- Player name -->
        <text x="80" y="40" fill="white" font-family="Arial" font-size="20">${stats.name}</text>
        
        <!-- Stats -->
        <text x="560" y="40" fill="white" font-family="Arial" font-size="20">${stats.kills}</text>
        <text x="660" y="40" fill="white" font-family="Arial" font-size="20">${Math.round(stats.damageDealt)}</text>
        <text x="760" y="40" fill="white" font-family="Arial" font-size="20">${stats.assists}</text>
        <text x="860" y="40" fill="white" font-family="Arial" font-size="20">${stats.revives}</text>
        <text x="960" y="40" fill="white" font-family="Arial" font-size="20">${formatTime(stats.timeSurvived)}</text>
    </g>`;
}

// Updated generateMatchHistorySVG function
function generateMatchHistorySVG(matches) {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${matches.length * 80 + 20}"
         xmlns:xlink="http://www.w3.org/1999/xlink">
        <defs>
            <!-- Define patterns for map backgrounds -->
            ${matches.map((match, index) => {
                const mapId = match.matchData.data.attributes.mapName;
                return `
                <pattern id="map-${index}" patternUnits="userSpaceOnUse" width="1000" height="75">
                    <image xlink:href="${MAP_ASSETS[mapId + '_Thumbnail']}"
                           width="1000" height="75" preserveAspectRatio="xMidYMid slice"/>
                </pattern>
                `;
            }).join('')}
        </defs>

        <!-- Background -->
        <rect width="100%" height="100%" fill="#1A1A1A"/>

        ${matches.map((match, index) => {
            const stats = match.playerStats.attributes.stats;
            const matchInfo = match.matchData.data.attributes;
            const timeSince = getTimeSinceMatch(new Date(matchInfo.createdAt));
            
            return `
            <g class="match-row" transform="translate(0,${index * 80})"
               opacity="${stats.winPlace === 1 ? '1' : '0.9'}">
                <!-- Map background -->
                <rect width="1000" height="75" fill="url(#map-${index})"/>
                
                <!-- Dark overlay for better text readability -->
                <rect width="1000" height="75" fill="#000000" opacity="0.5"/>
                
                <!-- Highlight bar for winners -->
                ${stats.winPlace === 1 ? 
                  '<rect x="0" y="0" width="4" height="75" fill="#FFD700"/>' : ''}
                
                <!-- Placement -->
                <text x="20" y="45" class="placement" 
                      fill="${stats.winPlace === 1 ? '#FFD700' : 'white'}"
                      font-weight="bold">
                    #${stats.winPlace}/${matchInfo.totalParticipants}
                </text>

                <!-- Match info -->
                <text x="150" y="30" class="time" fill="#CCCCCC">${timeSince}</text>
                <text x="150" y="55" class="mode" fill="#CCCCCC">
                    ${matchInfo.matchType.toUpperCase()} MODE
                </text>

                <!-- Game mode -->
                <text x="400" y="45" class="mode" fill="white">SQUAD TPP</text>

                <!-- Stats -->
                <text x="600" y="45" class="stats" fill="white">${stats.kills}</text>
                <text x="700" y="45" class="stats" fill="white">${stats.assists}</text>
                <text x="800" y="45" class="stats" fill="white">
                    ${Math.round(stats.damageDealt)}
                </text>
                <text x="900" y="45" class="stats" fill="white">
                    ${formatTime(stats.timeSurvived)}
                </text>

                <!-- Last weapon used (if available) -->
                ${stats.lastKillWeapon ? `
                <image x="950" y="20" width="35" height="35"
                       xlink:href="${WEAPON_ICONS[stats.lastKillWeapon]}"
                       opacity="0.7"/>
                ` : ''}
            </g>
            `;
        }).join('')}
    </svg>`;
}

// Helper function to format time
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

module.exports = {
    SVG_DEFS,
    generateHeader,
    generatePlayerRow
};