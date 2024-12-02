# Detailed Setup Guide for PUBGpal Bot

## Prerequisites

1. **Node.js Installation**
   - Download from [nodejs.org](https://nodejs.org/)
   - Required version: 16.x or higher
   - Verify installation:
     ```bash
     node --version
     npm --version
     ```

2. **Discord Developer Account**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application"
   - Navigate to "Bot" section
   - Create a new bot
   - Copy the token
   - Enable necessary Privileged Gateway Intents:
     - Presence Intent
     - Server Members Intent
     - Message Content Intent

3. **PUBG API Key**
   - Visit [PUBG Developer Portal](https://developer.pubg.com/)
   - Create an account
   - Generate an API key

## Installation Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/Ryggs/pubg-stats-bot.git
   cd pubg-stats-bot
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your tokens
   ```

4. **Setup Database (Optional)**
   ```bash
   npm run setup-db
   ```

5. **Verify Installation**
   ```bash
   npm run verify
   ```

## Bot Configuration

1. **Discord Bot Settings**
   - Enable required privileged intents in Discord Developer Portal
   - Generate invite URL with required permissions
   - Add bot to your server

2. **Environment Variables**
   ```env
   DISCORD_TOKEN=your_discord_token
   PUBG_API_KEY=your_pubg_api_key
   NODE_ENV=development
   LOG_LEVEL=info
   ```

3. **Command Registration**
   ```bash
   npm run register-commands
   ```

## Running the Bot

1. **Development Mode**
   ```bash
   npm run dev
   ```

2. **Production Mode**
   ```bash
   npm start
   ```

## Updating the Bot

1. **Pull Latest Changes**
   ```bash
   git pull origin main
   ```

2. **Update Dependencies**
   ```bash
   npm install
   ```

3. **Run Migrations (if any)**
   ```bash
   npm run migrate
   ```

## Security Considerations

1. **Token Security**
   - Never commit tokens to git
   - Rotate tokens regularly
   - Use environment variables

2. **Rate Limiting**
   - Implement cooldowns on commands
   - Respect PUBG API limits
   - Monitor usage patterns