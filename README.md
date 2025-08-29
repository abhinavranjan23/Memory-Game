# 🎮 Memory Masters - Multiplayer Memory Card Game

A feature-rich, secure, and visually stunning multiplayer memory card game built with modern web technologies. Experience engaging gameplay with real-time multiplayer, power-ups, achievements, and beautiful animations.

## ✨ Key Features

### 🎯 **Game Modes**

- **Classic Mode**: Traditional memory game with no time limit
- **Blitz Mode**: Fast-paced timed gameplay with sudden death mechanics
- **Sudden Death Mode**: One mistake elimination - last player standing wins
- **Power-up Frenzy**: Enhanced gameplay with special abilities and strategic elements

### 🎮 **Core Gameplay**

- **Real-time Multiplayer**: Up to 4 players per room
- **Multiple Board Sizes**: 4x4, 6x6, and 8x8 card layouts
- **Theme Variety**: Emojis, Animals, Fruits, Shapes, and more
- **Live Chat System**: In-game communication between players
- **Turn-based Mechanics**: Fair and organized gameplay flow
- **Score Tracking**: Real-time score calculation and display

### ⚡ **Power-up System**

- **Peek**: Reveal cards temporarily to help with memory
- **Swap**: Exchange positions of two cards on the board
- **Reveal**: Permanently show a card's face
- **Strategic Usage**: Limited power-ups per game for balanced gameplay
- **Power-up Tutorial**: Interactive guide for new players

### 🏆 **Achievement & Progression System**

- **Comprehensive Statistics**: Games played, win rate, best scores, perfect games
- **Achievement Unlocks**: Various milestones and accomplishments
- **Leaderboards**: Global rankings across multiple categories
- **Match History**: Detailed record of past games
- **Performance Metrics**: Average flip time, power-ups used, match streaks

### 🎨 **Visual & UX Features**

- **Beautiful Animations**: Framer Motion powered smooth transitions and GSAP for complex sequences
- **Dark/Light Theme**: Toggle between themes with system preference detection
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Interactive Elements**: Hover effects, 3D transforms, and micro-animations
- **Floating Particles**: Dynamic background elements for visual appeal
- **Loading States**: Smooth loading animations and skeleton screens
- **Advanced Animations**: GSAP ScrollTrigger for scroll-based animations
- **3D Effects**: Card flip animations with perspective transforms
- **Particle Systems**: Dynamic floating elements and visual effects

### 🔒 **Security & Anti-Cheat**

- **JWT Authentication**: Secure token-based authentication system
- **Anti-Cheat System**: Real-time monitoring and pattern detection
- **Input Validation**: Comprehensive validation and sanitization
- **Rate Limiting**: Protection against abuse and spam
- **Game State Validation**: Prevents manipulation and cheating
- **User Blocking**: Automatic detection and blocking of suspicious users

### 👥 **User Management**

- **Guest Mode**: Play without registration with limited features
- **User Registration**: Secure account creation with email verification
- **Profile Management**: Customizable usernames, avatars, and settings
- **Privacy Controls**: Option to hide from leaderboards
- **Password Security**: Eye icon toggle for password visibility
- **Username Validation**: Real-time availability checking

### 🏠 **Room Management**

- **Public Rooms**: Join existing games or create new ones
- **Private Rooms**: Password-protected games for friends
- **Room Settings**: Customizable game modes, board sizes, and themes
- **Waiting Area**: Pre-game lobby with player list and chat
- **Auto-cleanup**: Automatic removal of inactive games

### 📊 **Dashboard & Analytics**

- **Personal Dashboard**: Overview of stats, recent matches, and achievements
- **Quick Play**: Instant game creation with default settings
- **Activity Feed**: Recent gaming activity and milestones
- **Performance Charts**: Visual representation of gaming progress
- **Achievement Tracking**: Progress towards various accomplishments

### 🏅 **Leaderboard System**

- **Multiple Categories**: Total score, win rate, most active players
- **Time Filters**: All-time, weekly, and monthly rankings
- **Search Functionality**: Find specific players quickly
- **Global Statistics**: Overall game statistics and metrics
- **Pagination**: Efficient loading of large datasets

### 👨‍💼 **Admin Features**

- **Anti-Cheat Reports**: Detailed reports of suspicious activities
- **User Management**: Block/unblock users and manage accounts
- **Database Cleanup**: Remove old and inactive games
- **System Monitoring**: Health checks and performance metrics
- **Security Dashboard**: Overview of security events and threats

## 🛠️ Technology Stack

### **Frontend**

- **React 18**: Modern UI framework with hooks and context
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Framer Motion**: Advanced animation library for component transitions
- **GSAP**: Professional-grade animations and effects for complex sequences
- **Socket.IO Client**: Real-time communication
- **Axios**: HTTP client for API requests
- **React Router**: Client-side routing
- **Heroicons**: Beautiful icon library
- **Headless UI**: Accessible UI components

### **Backend**

- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **Socket.IO**: Real-time bidirectional communication
- **MongoDB**: NoSQL database for data persistence
- **Mongoose**: MongoDB object modeling
- **JWT**: JSON Web Tokens for authentication
- **bcryptjs**: Password hashing and security
- **Joi**: Schema validation library
- **XSS**: Input sanitization for security
- **Redis**: Caching and session management
- **Morgan**: HTTP request logging
- **Helmet**: Security middleware

### **Development Tools**

- **Nodemon**: Auto-restart server during development
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Git**: Version control

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **Redis** (v6.0 or higher) - Optional but recommended
- **npm** or **yarn** package manager

## 📁 Project Structure

```
memory-card-game/
├── 📁 client/                          # Frontend React Application
│   ├── 📁 public/                      # Static assets
│   │   ├── index.html                  # Main HTML template
│   │   └── favicon.ico                 # App icon
│   ├── 📁 src/                         # Source code
│   │   ├── 📁 components/              # Reusable UI components
│   │   │   ├── 📁 layout/              # Layout components
│   │   │   │   ├── Navbar.jsx          # Navigation bar
│   │   │   │   ├── Footer.jsx          # Footer component
│   │   │   │   └── LoadingSpinner.jsx  # Loading indicator
│   │   │   ├── 📁 game/                # Game-specific components
│   │   │   │   ├── Card.jsx            # Individual card component
│   │   │   │   ├── GameBoard.jsx       # Game board layout
│   │   │   │   ├── PowerUpButton.jsx   # Power-up controls
│   │   │   │   ├── ChatBox.jsx         # In-game chat
│   │   │   │   └── PlayerList.jsx      # Player information
│   │   │   └── 📁 ui/                  # UI components
│   │   │       ├── Button.jsx          # Reusable button
│   │   │       ├── Modal.jsx           # Modal dialog
│   │   │       └── Toast.jsx           # Notification toast
│   │   ├── 📁 pages/                   # Page components
│   │   │   ├── Home.jsx                # Landing page
│   │   │   ├── Login.jsx               # Login page
│   │   │   ├── Register.jsx            # Registration page
│   │   │   ├── Dashboard.jsx           # User dashboard
│   │   │   ├── Game.jsx                # Main game page
│   │   │   ├── WaitingArea.jsx         # Pre-game lobby
│   │   │   ├── Profile.jsx             # User profile
│   │   │   ├── Leaderboard.jsx         # Global rankings
│   │   │   └── AdminDashboard.jsx      # Admin panel
│   │   ├── 📁 contexts/                # React contexts
│   │   │   ├── AuthContext.jsx         # Authentication state
│   │   │   ├── GameContext.jsx         # Game state management
│   │   │   └── ThemeContext.jsx        # Theme management
│   │   ├── 📁 hooks/                   # Custom React hooks
│   │   │   ├── useSocket.js            # Socket.IO hook
│   │   │   ├── useGame.js              # Game logic hook
│   │   │   └── useAuth.js              # Authentication hook
│   │   ├── 📁 utils/                   # Utility functions
│   │   │   ├── api.js                  # API client
│   │   │   ├── socket.js               # Socket configuration
│   │   │   ├── animations.js           # Animation utilities
│   │   │   └── helpers.js              # Helper functions
│   │   ├── 📁 styles/                  # Styling files
│   │   │   ├── index.css               # Global styles
│   │   │   └── components.css          # Component styles
│   │   ├── App.jsx                     # Main app component
│   │   ├── main.jsx                    # App entry point
│   │   └── index.css                   # Root styles
│   ├── package.json                    # Frontend dependencies
│   ├── vite.config.js                  # Vite configuration
│   └── tailwind.config.js              # Tailwind CSS config
├── 📁 server/                          # Backend Node.js Application
│   ├── 📁 src/                         # Source code
│   │   ├── 📁 models/                  # Database models
│   │   │   ├── User.js                 # User model
│   │   │   ├── Game.js                 # Game model
│   │   │   └── index.js                # Model exports
│   │   ├── 📁 routes/                  # API routes
│   │   │   ├── auth.js                 # Authentication routes
│   │   │   ├── game.js                 # Game management routes
│   │   │   ├── user.js                 # User profile routes
│   │   │   ├── admin.js                # Admin panel routes
│   │   │   └── index.js                # Route exports
│   │   ├── 📁 middleware/              # Express middleware
│   │   │   ├── auth.js                 # Authentication middleware
│   │   │   ├── rateLimit.js            # Rate limiting
│   │   │   ├── validation.js           # Input validation
│   │   │   └── errorHandler.js         # Error handling
│   │   ├── 📁 socket/                  # Socket.IO handlers
│   │   │   ├── index.js                # Socket initialization
│   │   │   ├── gameEngine.js           # Game logic engine
│   │   │   └── handlers/               # Event handlers
│   │   │       ├── gameHandlers.js     # Game events
│   │   │       ├── chatHandlers.js     # Chat events
│   │   │       └── roomHandlers.js     # Room management
│   │   ├── 📁 utils/                   # Utility functions
│   │   │   ├── auth.js                 # Authentication utilities
│   │   │   ├── gameLogic.js            # Game logic utilities
│   │   │   ├── antiCheat.js            # Anti-cheat system
│   │   │   ├── metrics.js              # Analytics and metrics
│   │   │   ├── validation.js           # Validation schemas
│   │   │   └── helpers.js              # Helper functions
│   │   ├── 📁 config/                  # Configuration files
│   │   │   ├── database.js             # Database configuration
│   │   │   ├── redis.js                # Redis configuration
│   │   │   └── socket.js               # Socket.IO configuration
│   │   ├── 📁 services/                # Business logic services
│   │   │   ├── gameService.js          # Game business logic
│   │   │   ├── userService.js          # User management
│   │   │   └── notificationService.js  # Notification handling
│   │   ├── app.js                      # Express app setup
│   │   └── index.js                    # Server entry point
│   ├── 📁 test/                        # Test files
│   │   ├── auth.test.js                # Authentication tests
│   │   ├── gameLogic.test.js           # Game logic tests
│   │   ├── powerup.test.js             # Power-up system tests
│   │   └── run-all-tests.js            # Test runner
│   ├── package.json                    # Backend dependencies
│   ├── .env.example                    # Environment variables template
│   └── nodemon.json                    # Development configuration
├── 📁 docs/                            # Documentation
│   ├── API.md                          # API documentation
│   ├── DEPLOYMENT.md                   # Deployment guide
│   ├── SECURITY.md                     # Security documentation
│   └── CONTRIBUTING.md                 # Contribution guidelines
├── 📁 scripts/                         # Build and deployment scripts
│   ├── build.sh                        # Production build script
│   ├── deploy.sh                       # Deployment script
│   └── setup.sh                        # Initial setup script
├── docker-compose.yml                  # Docker configuration
├── Dockerfile                          # Docker image definition
├── .gitignore                          # Git ignore rules
├── README.md                           # Project documentation
└── package.json                        # Root package.json
```

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd memory-card-game
```

### 2. Install Dependencies

#### Backend Setup

```bash
cd server
npm install
```

#### Frontend Setup

```bash
cd client
npm install
```

### 3. Environment Configuration

#### Backend Environment (.env)

Create a `.env` file in the `server` directory:

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

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379
```

#### Frontend Environment (.env)

Create a `.env` file in the `client` directory:

```env
VITE_API_URL=http://localhost:3001/api
```

### 4. Database Setup

#### MongoDB

```bash
# Start MongoDB service
mongod
```

#### Redis (Optional)

```bash
# Start Redis service
redis-server
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

## 🎮 Game Features in Detail

### **Multiplayer Gameplay**

- **Real-time Synchronization**: All players see the same game state
- **Turn Management**: Automatic turn progression and validation
- **Player Status**: Online/offline status and connection monitoring
- **Game State Persistence**: Games continue even if players disconnect
- **Auto-reconnection**: Seamless reconnection to ongoing games

### **Power-up Mechanics**

- **Peek Power-up**: Temporarily reveal cards for strategic advantage
- **Swap Power-up**: Exchange card positions to confuse opponents
- **Reveal Power-up**: Permanently show a card's face
- **Limited Usage**: Balanced power-up distribution per game
- **Strategic Timing**: Optimal usage timing for maximum effectiveness

### **Scoring System**

- **Base Score**: Points for each matched pair
- **Time Bonus**: Faster matches earn additional points
- **Perfect Game Bonus**: Complete games without mistakes
- **Power-up Efficiency**: Bonus points for strategic power-up usage
- **Multiplier System**: Score multipliers for consecutive matches

### **Achievement System**

- **First Win**: Win your first game
- **Perfect Match**: Complete a game without mistakes
- **Speed Demon**: Win a game under time limit
- **Power Player**: Use all power-ups effectively
- **Social Butterfly**: Play with many different players
- **Streak Master**: Win multiple games in a row

### **Chat & Communication**

- **In-game Chat**: Real-time messaging during games
- **Emoji Support**: Express emotions with emoji reactions
- **Chat History**: Persistent chat messages throughout the game
- **Player Notifications**: System messages for game events
- **Mute Options**: Control chat visibility and notifications

## 🔒 Security Features

### **Authentication & Authorization**

- **JWT Tokens**: Secure access and refresh token system
- **Token Expiration**: Configurable token lifetimes
- **Guest Users**: Limited access with temporary tokens
- **Password Security**: bcrypt hashing with configurable rounds
- **Session Management**: Secure session handling and cleanup

### **Anti-Cheat System**

- **Game State Validation**: Hash-based state verification
- **Action Rate Limiting**: Prevents spam and bot behavior
- **Pattern Detection**: Identifies suspicious player actions
- **User Blocking**: Automatic blocking of cheaters
- **Real-time Monitoring**: Continuous surveillance of game activities

### **Input Validation & Sanitization**

- **Schema Validation**: Joi-based input validation
- **XSS Prevention**: Input sanitization using xss library
- **SQL Injection Protection**: Parameterized queries
- **Rate Limiting**: Request throttling per user/IP
- **Data Sanitization**: Clean and validate all user inputs

### **Game Security**

- **Turn Validation**: Ensures players can only act on their turn
- **Card State Validation**: Prevents invalid card operations
- **Power-up Validation**: Ensures legitimate power-up usage
- **Game Completion Validation**: Prevents impossible game states
- **State Integrity**: Maintains game state consistency

## ⚡ Performance Optimizations

### **Database Optimizations**

- **Indexed Queries**: Optimized database operations
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Minimal database round trips
- **Caching Strategy**: Redis-based caching for frequently accessed data

### **Real-time Communication**

- **Socket.IO Optimization**: Efficient real-time updates
- **Event Throttling**: Prevents excessive socket events
- **Connection Management**: Proper socket cleanup
- **Message Batching**: Grouped updates for better performance

### **Memory Management**

- **Automatic Cleanup**: Regular cleanup of old data
- **Memory Leak Prevention**: Proper event listener cleanup
- **Resource Management**: Efficient resource allocation
- **Garbage Collection**: Optimized memory usage patterns

### **Frontend Optimizations**

- **Code Splitting**: Lazy loading of components
- **Image Optimization**: Compressed and optimized assets
- **Bundle Optimization**: Minimized and optimized JavaScript bundles
- **Caching Strategy**: Browser caching for static assets
- **Animation Performance**: Optimized GSAP and Framer Motion rendering
- **Memory Management**: Proper cleanup of animation instances
- **Responsive Images**: Optimized for different screen sizes

## 🎨 UI/UX Features

### **Responsive Design**

- **Mobile-First**: Optimized for mobile devices
- **Tablet Support**: Responsive layouts for tablets
- **Desktop Experience**: Enhanced features for larger screens
- **Touch-Friendly**: Optimized touch interactions

### **Accessibility**

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and semantic HTML
- **Color Contrast**: High contrast ratios for readability
- **Focus Management**: Proper focus indicators and management

### **Animations & Effects**

- **Smooth Transitions**: Framer Motion powered animations
- **GSAP Animations**: Professional-grade complex animation sequences
- **Scroll-triggered Animations**: GSAP ScrollTrigger for scroll-based effects
- **Micro-interactions**: Subtle feedback for user actions
- **Loading States**: Engaging loading animations
- **Hover Effects**: Interactive hover states
- **3D Transforms**: Depth and perspective effects
- **Card Flip Animations**: Smooth 3D card transitions
- **Particle Systems**: Dynamic floating elements and visual effects
- **Performance Optimized**: Efficient animation rendering and cleanup

## 📊 Monitoring & Analytics

### **Health Checks**

- **Server Health**: `/health` endpoint for monitoring
- **Database Status**: Connection monitoring and alerts
- **Game Statistics**: Real-time metrics and analytics
- **Performance Monitoring**: Response time and throughput tracking

### **Logging System**

- **Request Logging**: Morgan HTTP logging middleware
- **Error Logging**: Comprehensive error tracking and reporting
- **Security Events**: Suspicious activity logging
- **Performance Metrics**: Response time and resource usage tracking
- **Game Events**: Detailed logging of game activities

### **Analytics Dashboard**

- **User Metrics**: Active users, engagement, retention
- **Game Statistics**: Games played, completion rates, average scores
- **Performance Data**: Server response times, database performance
- **Security Reports**: Anti-cheat events and security incidents

## 🔌 API Endpoints

### **Authentication Endpoints**

#### **POST** `/api/auth/register`

Register a new user account

```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

#### **POST** `/api/auth/login`

Login with existing credentials

```json
{
  "email": "string",
  "password": "string"
}
```

#### **POST** `/api/auth/guest`

Create a guest account for immediate play

```json
{
  "username": "string"
}
```

#### **POST** `/api/auth/refresh`

Refresh access token using refresh token

```json
{
  "refreshToken": "string"
}
```

#### **POST** `/api/auth/logout`

Logout and invalidate tokens

```json
{
  "refreshToken": "string"
}
```

#### **GET** `/api/auth/me`

Get current user profile (requires auth)

### **Game Management Endpoints**

#### **GET** `/api/game/rooms`

Get list of available public rooms

```json
{
  "rooms": [
    {
      "roomId": "string",
      "hostId": "string",
      "hostUsername": "string",
      "playerCount": "number",
      "maxPlayers": "number",
      "gameMode": "string",
      "boardSize": "string",
      "theme": "string",
      "isPrivate": "boolean",
      "createdAt": "date"
    }
  ]
}
```

#### **POST** `/api/game/create`

Create a new game room (requires auth)

```json
{
  "isPrivate": "boolean",
  "password": "string",
  "settings": {
    "maxPlayers": "number",
    "boardSize": "string",
    "gameMode": "string",
    "theme": "string",
    "powerUpsEnabled": "boolean",
    "timeLimit": "number"
  }
}
```

#### **GET** `/api/game/:roomId`

Get specific game details (requires auth)

#### **POST** `/api/game/:roomId/join`

Join a game room (requires auth)

```json
{
  "password": "string" // Required for private rooms
}
```

#### **DELETE** `/api/game/:roomId/leave`

Leave a game room (requires auth)

### **User Statistics Endpoints**

#### **GET** `/api/game/stats/user`

Get current user's game statistics (requires auth)

```json
{
  "statistics": {
    "gamesPlayed": "number",
    "gamesWon": "number",
    "winRate": "number",
    "totalScore": "number",
    "bestScore": "number",
    "averageFlipTime": "number",
    "longestMatchStreak": "number",
    "powerUpsUsed": "number",
    "perfectGames": "number",
    "averageScore": "number"
  }
}
```

#### **GET** `/api/game/stats/global`

Get global game statistics (no auth required)

```json
{
  "statistics": {
    "totalGames": "number",
    "totalPlayers": "number",
    "activeGames": "number",
    "totalMatches": "number",
    "averageGameDuration": "number"
  }
}
```

### **Leaderboard Endpoints**

#### **GET** `/api/game/leaderboard/global`

Get global leaderboards (no auth required)

```json
{
  "leaderboards": {
    "totalScore": [
      {
        "rank": "number",
        "id": "string",
        "username": "string",
        "avatar": "string",
        "totalScore": "number",
        "gamesPlayed": "number",
        "winRate": "number"
      }
    ],
    "winRate": [...],
    "gamesPlayed": [...]
  },
  "pagination": {
    "currentPage": "number",
    "limit": "number",
    "totalItems": "number",
    "hasMore": "boolean"
  }
}
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)
- `timeframe`: "all", "week", "month" (default: "all")

### **Match History Endpoints**

#### **GET** `/api/game/history/matches`

Get user's match history (requires auth)

```json
{
  "matches": [
    {
      "gameId": "string",
      "roomId": "string",
      "gameMode": "string",
      "boardSize": "string",
      "result": "string",
      "score": "number",
      "opponents": [
        {
          "userId": "string",
          "username": "string",
          "score": "number"
        }
      ],
      "startedAt": "date",
      "endedAt": "date",
      "duration": "number"
    }
  ],
  "pagination": {
    "currentPage": "number",
    "limit": "number",
    "totalItems": "number",
    "hasMore": "boolean"
  }
}
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)
- `gameMode`: Filter by game mode
- `result`: Filter by result ("won", "lost", "tied")

### **User Profile Endpoints**

#### **GET** `/api/user/:userId`

Get public user profile (no auth required)

```json
{
  "profile": {
    "username": "string",
    "avatar": "string",
    "memberSince": "date",
    "stats": {
      "gamesPlayed": "number",
      "gamesWon": "number",
      "winRate": "number",
      "totalScore": "number",
      "bestMatchStreak": "number",
      "perfectGames": "number"
    },
    "achievements": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "iconUrl": "string",
        "unlockedAt": "date"
      }
    ]
  }
}
```

#### **PATCH** `/api/auth/profile`

Update user profile (requires auth)

```json
{
  "username": "string",
  "avatar": "string",
  "privacySettings": {
    "showInLeaderboards": "boolean",
    "allowFriendRequests": "boolean",
    "showOnlineStatus": "boolean"
  }
}
```

### **Admin Endpoints** (Admin only)

#### **GET** `/api/admin/stats`

Get system statistics

```json
{
  "systemStats": {
    "totalUsers": "number",
    "activeUsers": "number",
    "totalGames": "number",
    "activeGames": "number",
    "serverUptime": "number",
    "memoryUsage": "number",
    "cpuUsage": "number"
  }
}
```

#### **GET** `/api/admin/users`

Get all users with pagination

```json
{
  "users": [
    {
      "id": "string",
      "username": "string",
      "email": "string",
      "isGuest": "boolean",
      "isAdmin": "boolean",
      "lastActive": "date",
      "createdAt": "date",
      "stats": {...}
    }
  ],
  "pagination": {...}
}
```

#### **POST** `/api/admin/users/:userId/block`

Block a user

```json
{
  "reason": "string",
  "duration": "number" // in hours, 0 for permanent
}
```

#### **POST** `/api/admin/users/:userId/unblock`

Unblock a user

#### **GET** `/api/admin/games`

Get all games with pagination

```json
{
  "games": [
    {
      "roomId": "string",
      "hostId": "string",
      "status": "string",
      "playerCount": "number",
      "createdAt": "date",
      "startedAt": "date",
      "endedAt": "date"
    }
  ],
  "pagination": {...}
}
```

#### **DELETE** `/api/admin/games/:roomId`

Force delete a game

### **Socket.IO Events**

#### **Client → Server Events**

- `join-room`: Join a game room

  ```json
  {
    "roomId": "string",
    "password": "string" // for private rooms
  }
  ```

- `leave-room`: Leave current room

- `toggle-ready`: Toggle ready status

- `flip-card`: Flip a card during game

  ```json
  {
    "cardId": "number"
  }
  ```

- `use-powerup`: Activate a power-up

  ```json
  {
    "powerUpType": "string",
    "target": "object" // depends on power-up type
  }
  ```

- `send-chat`: Send chat message

  ```json
  {
    "message": "string"
  }
  ```

- `get-game-state`: Request current game state

#### **Server → Client Events**

- `room-joined`: Confirmation of room join
- `room-left`: Confirmation of leaving room
- `player-joined`: New player joined the room
- `player-left`: Player left the room
- `game-state`: Updated game state
- `turn-changed`: Turn has changed to another player
- `card-flipped`: Card was flipped
- `cards-matched`: Cards were matched
- `cards-flipped-back`: Cards were flipped back
- `powerup-activated`: Power-up was used
- `game-started`: Game has started
- `game-ended`: Game has ended
- `chat-message`: New chat message
- `error`: Error message
- `warning`: Warning message
- `info`: Information message

### **Error Responses**

All endpoints return consistent error responses:

```json
{
  "message": "string",
  "error": "string", // optional
  "statusCode": "number"
}
```

**Common Status Codes:**

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `429`: Too Many Requests
- `500`: Internal Server Error

## 🚀 Deployment

### **Production Checklist**

- [ ] Set secure JWT secrets and environment variables
- [ ] Configure production database with proper security
- [ ] Set up SSL/TLS certificates for HTTPS
- [ ] Configure reverse proxy (nginx) for load balancing
- [ ] Set up monitoring and logging systems
- [ ] Configure backup strategies for data persistence
- [ ] Set up CI/CD pipeline for automated deployments
- [ ] Configure Redis for caching and session management
- [ ] Set up CDN for static asset delivery
- [ ] Configure rate limiting and security headers

### **Docker Deployment**

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### **Environment Variables**

Ensure all production environment variables are properly configured:

- Database connection strings
- JWT secrets and expiration times
- Redis configuration
- API endpoints and URLs
- Security settings and rate limits

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add some amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Development Guidelines**

- Follow the existing code style and conventions
- Add tests for new features and functionality
- Update documentation for any API changes
- Ensure all tests pass before submitting PR
- Include screenshots for UI changes

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- **Create an issue** in the repository
- **Check the documentation** for common solutions
- **Review the test suite** for usage examples
- **Join our community** for discussions and help

## 🚀 Future Improvements & Roadmap

### **🎵 Audio & Sound System** (Phase 1)

#### **Notification Sounds**

- **Game Events**: Card flip, match found, power-up activation
- **UI Interactions**: Button clicks, hover effects, transitions
- **Achievement Unlocks**: Special sound effects for milestone accomplishments
- **Chat Notifications**: Message received, player joined/left
- **Customizable Audio**: User-controlled volume levels and sound preferences

#### **Background Music**

- **Dynamic Music**: Changes based on game state and intensity
- **Theme Variations**: Different music for different game modes
- **Mood-based Selection**: Calm for waiting, intense for gameplay
- **User Preferences**: Option to disable or customize background music

### **🌍 Internationalization (i18n)** (Phase 1)

#### **Multi-language Support**

- **Core Languages**: English, Spanish, French, German, Portuguese, Chinese, Japanese
- **Dynamic Language Switching**: Real-time language changes without page reload
- **Localized Content**: Game instructions, UI elements, and error messages
- **Cultural Adaptations**: Region-specific themes and content

#### **Localization Features**

- **Date/Time Formatting**: Region-specific date and time displays
- **Number Formatting**: Localized number and currency formats
- **RTL Support**: Right-to-left language support (Arabic, Hebrew)
- **Cultural Sensitivity**: Appropriate content for different regions

### **🎨 Enhanced Theme System** (Phase 2)

#### **Custom Theme Selection**

- **Premium Themes**: Unlockable themes through achievements
- **Seasonal Themes**: Holiday and event-based themes
- **User-Created Themes**: Community theme creation and sharing
- **Dynamic Themes**: Themes that change based on time of day or season

#### **Advanced Customization**

- **Color Schemes**: Custom color palette selection
- **Card Designs**: Multiple card back designs and patterns
- **Background Options**: Animated backgrounds and particle effects
- **UI Skins**: Different interface styles and layouts

### **🏆 Expanded Achievement System** (Phase 2)

#### **New Achievement Categories**

- **Social Achievements**: Play with friends, join tournaments
- **Skill-based Achievements**: Perfect games, speed records, efficiency metrics
- **Collection Achievements**: Unlock all themes, collect special cards
- **Seasonal Achievements**: Time-limited event achievements

#### **Achievement Features**

- **Achievement Points**: Point system for unlocking rewards
- **Achievement Showcase**: Display achievements on profile
- **Progress Tracking**: Visual progress indicators for ongoing achievements
- **Achievement Sharing**: Share achievements on social media

### **🎮 Advanced Game Modes** (Phase 3)

#### **Tournament System**

- **Bracket Tournaments**: Single and double elimination formats
- **League System**: Seasonal leagues with rankings and promotions
- **Custom Tournaments**: User-created tournaments with custom rules
- **Prize System**: Virtual rewards and recognition for winners

#### **Cooperative Modes**

- **Team Play**: 2v2 or 3v3 team-based matches
- **Puzzle Mode**: Collaborative puzzle-solving challenges
- **Story Mode**: Narrative-driven single-player experience
- **Practice Mode**: AI opponents for skill development

### **🤝 Social Features** (Phase 3)

#### **Friend System**

- **Friend Requests**: Send and accept friend invitations
- **Friend List**: Manage and organize friends
- **Friend Activity**: See what friends are playing
- **Friend Challenges**: Direct challenges to friends

#### **Community Features**

- **Clans/Guilds**: Join or create gaming communities
- **Community Events**: Special events and challenges
- **Social Sharing**: Share game moments and achievements
- **Community Chat**: Global and clan-specific chat channels

### **📱 Mobile App** (Phase 4)

#### **Native Mobile Applications**

- **iOS App**: Native iOS application with full feature parity
- **Android App**: Native Android application with optimized performance
- **Cross-platform Sync**: Seamless data synchronization across devices
- **Push Notifications**: Real-time notifications for game events

#### **Mobile-Specific Features**

- **Touch Optimization**: Enhanced touch controls and gestures
- **Offline Mode**: Limited offline gameplay capabilities
- **Mobile-exclusive Content**: Special themes and features for mobile users
- **Performance Optimization**: Optimized for mobile hardware

### **🤖 AI & Machine Learning** (Phase 4)

#### **Smart Matchmaking**

- **Skill-based Matching**: AI-powered skill assessment and matching
- **Behavioral Analysis**: Match players based on play style preferences
- **Fair Play Detection**: Advanced cheating detection using ML
- **Dynamic Difficulty**: Adaptive difficulty based on player performance

#### **AI Opponents**

- **Intelligent AI**: Advanced AI opponents with different difficulty levels
- **Learning AI**: AI that adapts to player strategies
- **Personality-based AI**: Different AI personalities and play styles
- **Training Mode**: AI coaching and skill development

### **🔧 Technical Improvements** (Ongoing)

#### **Performance Enhancements**

- **WebAssembly**: Critical game logic in WebAssembly for better performance
- **Service Workers**: Offline capabilities and improved caching
- **Progressive Web App**: Full PWA implementation with app-like experience
- **Real-time Analytics**: Advanced analytics and performance monitoring

#### **Security Enhancements**

- **Advanced Anti-cheat**: Machine learning-based cheating detection
- **Blockchain Integration**: Decentralized achievements and rewards
- **Enhanced Encryption**: End-to-end encryption for sensitive data
- **Privacy Controls**: Granular privacy settings and data control

### **🎯 Accessibility Improvements** (Ongoing)

#### **Accessibility Features**

- **Screen Reader Support**: Full compatibility with screen readers
- **Keyboard Navigation**: Complete keyboard-only gameplay
- **Color Blind Support**: Special themes for color vision deficiencies
- **Audio Descriptions**: Audio descriptions for visual elements

#### **Inclusive Design**

- **Multiple Difficulty Levels**: Adaptive difficulty for different skill levels
- **Customizable UI**: Adjustable font sizes, contrast, and layout
- **Assistive Technologies**: Support for various assistive devices
- **Universal Design**: Design principles for maximum accessibility

### **📊 Analytics & Insights** (Phase 5)

#### **Advanced Analytics**

- **Player Behavior Analysis**: Deep insights into player behavior patterns
- **Game Balance Metrics**: Data-driven game balance improvements
- **Performance Monitoring**: Comprehensive performance tracking
- **Predictive Analytics**: Predict player churn and engagement

#### **Developer Tools**

- **Admin Analytics Dashboard**: Advanced admin tools for game management
- **A/B Testing Framework**: Built-in testing framework for features
- **Real-time Monitoring**: Live monitoring of game health and performance
- **Automated Reporting**: Automated reports and insights generation

---

## 🔄 Changelog

### **v1.0.0** - Initial Release

- ✅ Multiplayer memory card game with real-time gameplay
- ✅ Multiple game modes (Classic, Blitz, Sudden Death, Power-up Frenzy)
- ✅ Comprehensive power-up system with strategic elements
- ✅ Achievement and progression system
- ✅ Real-time chat and communication
- ✅ Beautiful UI with Framer Motion and GSAP animations
- ✅ Advanced anti-cheat system with real-time monitoring
- ✅ User management with guest mode support
- ✅ Leaderboard and statistics tracking
- ✅ Admin dashboard with monitoring tools
- ✅ Comprehensive testing suite
- ✅ Performance optimizations and caching
- ✅ Dark/light theme support with system preference detection
- ✅ Mobile-responsive design with touch optimization
- ✅ GSAP ScrollTrigger for scroll-based animations
- ✅ 3D card flip animations and particle systems
- ✅ Real-time Socket.IO communication
- ✅ JWT authentication with secure token management

### **v1.1.0** - Upcoming Features

- 🎵 **Audio System**: Notification sounds and background music
- 🌍 **i18n Support**: Multi-language internationalization
- 🎨 **Enhanced Themes**: Custom theme selection and premium themes
- 🏆 **Expanded Achievements**: New achievement categories and rewards
- 🤝 **Social Features**: Friend system and community features
- 📱 **Mobile Optimization**: Enhanced mobile experience and PWA features

### **v2.0.0** - Future Vision

- 🎮 **Advanced Game Modes**: Tournament system and cooperative play
- 🤖 **AI Integration**: Smart matchmaking and AI opponents
- 📊 **Advanced Analytics**: Player behavior analysis and insights
- 🔧 **Technical Improvements**: WebAssembly, blockchain integration
- 🎯 **Accessibility**: Comprehensive accessibility features
- 📱 **Native Apps**: iOS and Android applications

---

## 🆘 Support

For support and questions:

- **Create an issue** in the repository
- **Check the documentation** for common solutions
- **Review the test suite** for usage examples
- **Join our community** for discussions and help

## 🌐 Community & Links

- 📧 **Email**: support@memorymasters.com
- 🐦 **Twitter**: [@MemoryMasters](https://twitter.com/MemoryMasters)
- 📱 **Reddit**: [r/MemoryMasters](https://reddit.com/r/MemoryMasters)

---

**Built with ❤️ for secure, engaging, and enjoyable multiplayer gaming**

_Memory Masters - Where Strategy Meets Memory_
