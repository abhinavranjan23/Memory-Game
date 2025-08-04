# Memory Masters - Multiplayer Memory Card Game

A comprehensive multiplayer memory card game built with the MERN stack, featuring real-time gameplay, power-ups, multiple game modes, and social features.

## 🎮 Features

### Core Gameplay
- **Memory Card Matching**: Traditional card flipping and matching mechanics
- **Real-time Multiplayer**: Play with 2-4 players simultaneously
- **Multiple Board Sizes**: 4x4, 6x6, and 8x8 grids for different difficulty levels
- **Turn-based System**: Organized turn management with visual indicators

### Game Modes
- **🎯 Classic Mode**: Traditional memory game with turn-based gameplay
- **⚡ Blitz Mode**: Fast-paced 60-second memory challenges
- **💥 Sudden Death**: Tie-breaker rounds with single-pair elimination
- **🎮 Power-Up Frenzy**: Enhanced gameplay with special abilities

### Power-Ups System
- **🔄 Extra Turn**: Get another turn even if you miss
- **👁️ Peek**: Briefly see all unmatched cards
- **🔀 Card Swap**: Swap positions of two cards
- **💡 Reveal One**: Permanently reveal one card
- **❄️ Time Freeze**: Freeze the timer for 10 seconds
- **🌀 Shuffle Cards**: Shuffle all unmatched cards

### Themes & Customization
- **🎨 Multiple Themes**: Emojis, Animals, Tech Icons, Food
- **👤 Avatar System**: Choose from gallery or upload custom avatars
- **🌗 Dark/Light Mode**: Smooth theme transitions
- **🎯 Custom Board Sizes**: Select difficulty levels

### Social Features
- **💬 In-Game Chat**: Real-time messaging during games
- **🏆 Achievements System**: Unlock badges and milestones
- **📊 Leaderboards**: Global rankings and statistics
- **📄 Match History**: Track all past games and performance
- **🔐 Private Rooms**: Create password-protected games
- **👥 Friend System**: Add and play with friends

### Authentication & Users
- **🔑 Multiple Login Options**: Email/password, Google OAuth, Guest mode
- **📊 Detailed Statistics**: Win rate, average flip time, match streaks
- **🧠 Memory Meter**: Visual progress tracking based on performance
- **🚫 Moderation Tools**: Report/block system for toxic behavior

### Admin Features
- **📈 Dashboard**: Live monitoring of games and users
- **👮 Moderation**: Manage users, end games, review reports
- **📊 Analytics**: System statistics and usage patterns

## 🛠 Tech Stack

### Backend
- **Node.js** with **Express.js**
- **Socket.IO** for real-time communication
- **MongoDB** with **Mongoose** ODM
- **JWT** authentication
- **bcryptjs** for password hashing
- **TypeScript** for type safety

### Frontend
- **React 18** with **TypeScript**
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Socket.IO Client** for real-time features
- **React Router** for navigation
- **Axios** for HTTP requests
- **Framer Motion** for animations

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- MongoDB 4.4+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd memory-card-game
   ```

2. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Set up environment variables**
   
   **Backend** (`server/.env`):
   ```env
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/memory-game
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   GOOGLE_CLIENT_ID=your-google-oauth-client-id
   GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
   CLIENT_URL=http://localhost:5173
   NODE_ENV=development
   ```

   **Frontend** (`client/.env`):
   ```env
   VITE_API_URL=http://localhost:3001/api
   VITE_SOCKET_URL=http://localhost:3001
   ```

5. **Start MongoDB**
   ```bash
   mongod
   ```

6. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```

7. **Start the frontend development server**
   ```bash
   cd client
   npm run dev
   ```

8. **Open your browser**
   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
memory-card-game/
├── server/                 # Backend application
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Custom middleware
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── socket/         # Socket.IO handlers
│   │   ├── types/          # TypeScript definitions
│   │   ├── utils/          # Utility functions
│   │   └── index.ts        # Server entry point
│   ├── .env                # Environment variables
│   └── package.json
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Page components
│   │   ├── types/          # TypeScript definitions
│   │   ├── utils/          # Utility functions
│   │   └── App.tsx         # App entry point
│   ├── .env                # Environment variables
│   └── package.json
└── README.md
```

## 🎮 How to Play

1. **Sign Up or Login**: Create an account or play as a guest
2. **Join a Game**: Browse public rooms or create a private room
3. **Game Setup**: Choose board size, theme, and game mode
4. **Playing**: Take turns flipping cards to find matching pairs
5. **Power-Ups**: Collect and use special abilities strategically
6. **Scoring**: Earn points based on efficiency, speed, and streaks
7. **Win Conditions**: Game ends when all pairs are matched or time runs out

## 🏆 Achievement System

- **First Victory**: Win your first game
- **Perfect Memory**: Complete a game without wrong flips
- **Speed Demon**: Win a blitz mode game
- **Memory Master**: Get a 5+ match streak
- **Power Player**: Win using 3+ power-ups
- **Grandmaster**: Win an 8x8 board game

## 🔧 Development

### Backend Scripts
```bash
npm run dev      # Start development server with nodemon
npm run build    # Build TypeScript to JavaScript
npm start        # Start production server
```

### Frontend Scripts
```bash
npm run dev      # Start Vite development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🌟 Advanced Features

### Memory Meter
Visual progress bar showing memory skill based on:
- Speed of card flipping
- Accuracy of matches
- Match streaks
- Overall efficiency

### Combo System
Score multipliers for consecutive matches:
- 2 matches: 1.2x multiplier
- 3 matches: 1.5x multiplier
- 4+ matches: 2x multiplier

### Sudden Death Mode
When games are tied at time expiration:
- Single pair of cards
- First player to match wins
- 30-second time limit

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/guest` - Guest login
- `POST /api/auth/google` - Google OAuth

### Game
- `GET /api/game/rooms` - List public rooms
- `GET /api/game/leaderboard` - Global leaderboard
- `GET /api/game/history` - Match history
- `GET /api/game/themes` - Available themes

### User
- `GET /api/user/stats` - User statistics
- `PATCH /api/auth/profile` - Update profile

### Admin
- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/users` - User management
- `GET /api/admin/games` - Game monitoring

## 🔌 Socket.IO Events

### Client to Server
- `join-room` - Join a game room
- `leave-room` - Leave a game room
- `toggle-ready` - Toggle ready status
- `flip-card` - Flip a card
- `use-powerup` - Use a power-up
- `send-chat` - Send chat message

### Server to Client
- `room-joined` - Successfully joined room
- `player-joined` - Another player joined
- `game-started` - Game has started
- `card-flipped` - Card was flipped
- `match-found` - Cards matched
- `game-ended` - Game finished
- `chat-message` - New chat message

## 🚀 Deployment

### Backend (Node.js)
1. Set production environment variables
2. Build TypeScript: `npm run build`
3. Start server: `npm start`

### Frontend (Static Site)
1. Build for production: `npm run build`
2. Deploy `dist/` folder to static hosting
3. Configure environment variables

### Database
- MongoDB Atlas for cloud hosting
- Local MongoDB for development

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🎯 Future Enhancements

- **AI Opponents**: Single-player mode with AI
- **Tournaments**: Organized competitive events
- **Spectator Mode**: Watch games in progress
- **Card Animation Effects**: Enhanced visual feedback
- **Voice Chat**: Real-time voice communication
- **Mobile App**: React Native version
- **Custom Themes**: User-created card themes
- **Replay System**: Game replay functionality

## 🐛 Known Issues

- Socket reconnection needs improvement
- Mobile responsiveness could be enhanced
- Performance optimization for large boards

## 📞 Support

For support, email support@memorymasters.com or create an issue on GitHub.

---

**Memory Masters** - Test your memory, challenge your friends! 🧠🎮