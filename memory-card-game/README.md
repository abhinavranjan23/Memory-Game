# 🎮 Memory Card Game - Multiplayer

A secure, optimized, and feature-rich multiplayer memory card game built with React, Node.js, Socket.IO, and MongoDB.

## ✨ Features

### 🎯 Game Modes
- **Classic Mode**: Traditional memory game with no time limit
- **Blitz Mode**: Fast-paced timed gameplay with sudden death
- **Sudden Death Mode**: One mistake elimination
- **Power-up Frenzy**: Enhanced gameplay with special abilities

### 🔒 Security Features
- **JWT Authentication** with secure token management
- **Anti-Cheat System** with real-time monitoring
- **Input Validation & Sanitization** to prevent XSS attacks
- **Rate Limiting** to prevent abuse
- **Guest User Support** with limited privileges
- **Game State Validation** to prevent manipulation

### 🚀 Performance Optimizations
- **Efficient Database Queries** with proper indexing
- **Real-time Socket.IO** communication
- **Optimized Game Logic** with minimal latency
- **Memory Management** with automatic cleanup
- **Caching Strategies** for improved performance

### 🧪 Testing & Quality
- **Comprehensive Test Suite** covering all major components
- **Security Testing** for authentication and validation
- **Performance Testing** for game logic and database operations
- **Automated Test Runner** with detailed reporting

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Joi** - Input validation
- **XSS** - Input sanitization

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Socket.IO Client** - Real-time communication
- **Framer Motion** - Animations
- **Axios** - HTTP client

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd memory-card-game
```

### 2. Install Dependencies

#### Backend
```bash
cd server
npm install
```

#### Frontend
```bash
cd client
npm install
```

### 3. Environment Configuration

#### Backend Environment
Create a `.env` file in the `server` directory:

```bash
# Copy the example file
cp env.example .env
```

Edit the `.env` file with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=3001

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/memory-game

# Client Configuration
CLIENT_URL=http://localhost:5173

# JWT Configuration (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your-super-secure-jwt-secret-key-here-min-32-chars
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-here-min-32-chars

# JWT Token Expiration (in seconds)
JWT_ACCESS_EXPIRY=900  # 15 minutes
JWT_REFRESH_EXPIRY=604800  # 7 days
JWT_GUEST_EXPIRY=3600  # 1 hour

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX_REQUESTS=5
RATE_LIMIT_GAME_MAX_REQUESTS=50

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-key-here

# Game Configuration
MAX_PLAYERS_PER_ROOM=4
MAX_GAMES_PER_USER=3
GAME_TIMEOUT_MS=300000  # 5 minutes
```

#### Frontend Environment
Create a `.env` file in the `client` directory:

```env
VITE_API_URL=http://localhost:3001/api
```

### 4. Database Setup

Start MongoDB:
```bash
# Start MongoDB service
mongod
```

### 5. Running the Application

#### Development Mode

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
cd client
npm run dev
```

#### Production Mode

**Backend:**
```bash
cd server
npm start
```

**Frontend:**
```bash
cd client
npm run build
npm run preview
```

## 🧪 Testing

### Run All Tests
```bash
cd server
npm test
```

### Run Specific Test Suites
```bash
# Authentication tests
npm run test:auth

# Game logic tests
npm run test:game

# Power-up system tests
npm run test:powerup

# Security validation
npm run test:security
```

### Test Reports
Test results are saved to `server/test/test-report.json` with detailed information about:
- Test execution time
- Pass/fail status
- Error details
- Performance metrics

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure access and refresh tokens
- **Token Expiration**: Configurable token lifetimes
- **Guest Users**: Limited access with temporary tokens
- **Password Security**: bcrypt hashing with configurable rounds

### Anti-Cheat System
- **Game State Validation**: Hash-based state verification
- **Action Rate Limiting**: Prevents spam and bot behavior
- **Pattern Detection**: Identifies suspicious player actions
- **User Blocking**: Automatic blocking of cheaters

### Input Validation & Sanitization
- **Schema Validation**: Joi-based input validation
- **XSS Prevention**: Input sanitization using xss library
- **SQL Injection Protection**: Parameterized queries
- **Rate Limiting**: Request throttling per user/IP

### Game Security
- **Turn Validation**: Ensures players can only act on their turn
- **Card State Validation**: Prevents invalid card operations
- **Power-up Validation**: Ensures legitimate power-up usage
- **Game Completion Validation**: Prevents impossible game states

## ⚡ Performance Optimizations

### Database Optimizations
- **Indexed Queries**: Optimized database operations
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Minimal database round trips

### Real-time Communication
- **Socket.IO Optimization**: Efficient real-time updates
- **Event Throttling**: Prevents excessive socket events
- **Connection Management**: Proper socket cleanup

### Memory Management
- **Automatic Cleanup**: Regular cleanup of old data
- **Memory Leak Prevention**: Proper event listener cleanup
- **Resource Management**: Efficient resource allocation

## 🎮 Game Modes

### Classic Mode
- No time limit
- Traditional memory gameplay
- Power-ups available
- Perfect for casual players

### Blitz Mode
- Timed gameplay (configurable)
- Sudden death tiebreaker
- High-stakes competition
- Fast-paced action

### Sudden Death Mode
- One mistake elimination
- Last player standing wins
- Intense competition
- Quick gameplay

### Power-up Frenzy
- Enhanced power-up system
- Special abilities
- Strategic gameplay
- Unique mechanics

## 🔧 Configuration

### Game Settings
- **Board Sizes**: 4x4, 6x6, 8x8
- **Themes**: Emojis, Animals, Fruits, Shapes
- **Time Limits**: Configurable per game mode
- **Player Limits**: 2-4 players per room

### Security Settings
- **Rate Limits**: Configurable request limits
- **Token Expiration**: Adjustable token lifetimes
- **Password Requirements**: Configurable complexity rules
- **Anti-Cheat Sensitivity**: Adjustable detection thresholds

## 📊 Monitoring & Logging

### Health Checks
- **Server Health**: `/health` endpoint
- **Database Status**: Connection monitoring
- **Game Statistics**: Real-time metrics

### Logging
- **Request Logging**: Morgan HTTP logging
- **Error Logging**: Comprehensive error tracking
- **Security Events**: Suspicious activity logging
- **Performance Metrics**: Response time tracking

## 🚀 Deployment

### Production Checklist
- [ ] Set secure JWT secrets
- [ ] Configure production database
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Set up CI/CD pipeline

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Run the test suite
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the test suite for examples

## 🔄 Changelog

### v1.0.0
- Initial release
- Multiplayer functionality
- Security features
- Anti-cheat system
- Comprehensive testing
- Performance optimizations

---

**Built with ❤️ for secure and enjoyable multiplayer gaming**
