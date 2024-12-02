# Contributing to PUBGpal Bot

Thank you for your interest in contributing to PUBG Stats Bot! This document provides guidelines and steps for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help maintain a positive environment

## Getting Started

1. **Fork the Repository**
   ```bash
   git clone https://github.com/Ryggs/pubg-stats-bot.git
   cd pubg-stats-bot
   ```

2. **Set Up Development Environment**
   ```bash
   npm install
   cp .env.example .env
   # Configure your .env file
   ```

3. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Guidelines

### Code Style

- Use ESLint for code formatting
- Follow existing code patterns
- Add comments for complex logic

### Commit Messages

Format:
```
type(scope): description

[optional body]
[optional footer]
```

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

### Testing

1. **Write Tests**
   ```bash
   npm run test:watch
   ```

2. **Run All Tests**
   ```bash
   npm test
   ```

### Pull Request Process

1. **Update Documentation**
   - Add JSDoc comments
   - Update README if needed
   - Add tests for new features

2. **Submit PR**
   - Reference related issues
   - Describe your changes
   - Add screenshots if applicable

3. **Code Review**
   - Respond to feedback
   - Make requested changes
   - Keep PR focused

## Feature Requests

1. Check existing issues
2. Create detailed proposal
3. Discuss with maintainers
4. Start implementation

## Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots
- Bot version
- Node.js version

## Development Setup

1. **Required Tools**
   - Node.js 16+
   - npm or yarn
   - Git

2. **Environment Setup**
   ```bash
   npm install
   npm run dev
   ```

3. **Testing Tools**
   ```bash
   npm run lint
   npm test
   ```

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.