# PUBGPal Discord Bot 🎮

<div align="center">

![PUBG Stats Bot](https://img.shields.io/badge/PUBG-Stats%20Bot-blue?style=for-the-badge&logo=discord)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-16.x-green.svg)](https://nodejs.org)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-blue.svg)](https://discord.js.org)

A powerful Discord bot that provides real-time PUBG (PlayerUnknown's Battlegrounds) statistics, match history and player rankings.

[Add to Discord](#) | [Support Server](#) | [Report Bug](https://github.com/Ryggs/pubg-stats-bot/issues)

</div>

## 📋 Features

### Match History
- Detailed stats from recent matches
- Performance metrics and rankings
- Map-specific information
- Team composition details

### Player Statistics
- Lifetime performance metrics
- Weapon usage statistics
- Survival ratings
- Win ratios and trends

### Season Rankings
- Current season performance
- Rank progression tracking
- Competitive statistics
- Division placement
- 
## 🤖 Commands
|
 Command 
|
 Description 
|
 Usage 
|
|
----
|
----
|
----
|
`/matchhistory`
|
 View recent match details 
|
`/matchhistory [username] [matches?]`
`/playerstats`
|
 Check player statistics 
|
`/playerstats [username]`
`/seasonrank`
|
 View season ranking 
|
## 🚀 Quick Start

1. **Invite the Bot**
   - [Click here](#) to add the bot to your server
   - Select the server and authorize

2. **Basic Usage**
   ```
   /matchhistory NerdyToken
   /playerstats NerdyToken
   /seasonrank NerdyToken
   ```

## 💻 Installation

### Prerequisites
- Node.js 16.x or higher
- Discord Bot Token
- PUBG API Key

### Setup
1. Clone the repository
   ```bash
   git clone https://github.com/Ryggs/pubg-stats-bot.git
   cd pubg-stats-bot
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment
   ```bash
   cp .env.example .env
   # Edit .env with your tokens
   ```

4. Start the bot
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 📚 Documentation

- [Detailed Setup Guide](SETUP.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Contributing Guidelines](CONTRIBUTING.md)

## 📜 Legal
- [Terms of Use](TERMSOFUSE.md)
- [Privacy Policy](PRIVACYPOLICY.md)

## 🔧 Configuration

Example `.env` file:
```env
DISCORD_TOKEN=your_discord_token
PUBG_API_KEY=your_pubg_api_key
NODE_ENV=development
```

## 🧪 Testing

Run the test suite:
```bash
# Run all tests
npm test

# Run specific tests
npm run test:unit
npm run test:integration
```

## 📊 Stats & Performance

- 99.9% Uptime
- <50ms Response Time
- Rate Limited to prevent API abuse
- Automatic error recovery

## 🤝 Contributing

We welcome contributions! See our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 🐛 Bug Reports

Found a bug? Please [open an issue](https://github.com/Ryggs/pubg-stats-bot/issues) with:
- Bug description
- Steps to reproduce
- Expected vs actual behavior

## 🚀 Roadmap

- [ ] Add support for custom matches
- [ ] Implement tournament tracking
- [ ] Add weapon statistics
- [ ] Create web dashboard
- [ ] Add team tracking

## 💬 Support

Need help? Here are your options:
1. Check [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Join our [Discord Server](#)
3. Open a [GitHub Issue](https://github.com/Ryggs/pubg-stats-bot/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
Any use of this code must include clear attribution to the original repository at [PUBGPal](https://github.com/Ryggs/PubgPal) bot

---

<div align="center">

Made with ❤️ by [Ryggs](https://github.com/Ryggs)

⭐ Star us on GitHub | [Report Issues](https://github.com/Ryggs/PubgPal/issues)

</div>
