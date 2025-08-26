# 🧠 Memory Masters - Multiplayer Memory Card Game

A comprehensive, real-time multiplayer memory card game built with the MERN stack using pure JavaScript and JSX. Challenge your memory skills, play with friends, and climb the leaderboards!

## ✨ Features

### 🎮 Core Gameplay

- **Turn-based Memory Game**: Classic card matching with modern twists
- **Real-time Multiplayer**: Play with up to 4 players using Socket.IO
- **Multiple Board Sizes**: 4x4, 6x6, and 8x8 difficulty levels
- **Dynamic Themes**: Emojis, tech logos, and more visual themes

### 🚀 Game Modes

- **Classic Mode**: Traditional turn-based memory matching
- **Blitz Mode**: Fast-paced 60-second challenges
- **Sudden Death**: One mistake elimination rounds
- **Power-Up Frenzy**: Strategic use of special abilities

### ⚡ Power-Up System

- **Extra Turn**: Get another chance even if you miss
- **Peek**: Briefly reveal all unmatched cards
- **Card Swap**: Change positions of two cards
- **Reveal One**: Permanently show one card
- **Time Freeze**: Stop the timer for 10 seconds
- **Shuffle Cards**: Randomize unmatched card positions

### 👥 Social Features

- **Real-time Chat**: In-game messaging during matches
- **Private Rooms**: Password-protected games with friends
- **Avatar System**: Custom profile pictures and user identity
- **Guest Mode**: Play without registration

### 📊 Progress & Competition

- **Detailed Statistics**: Win rate, average flip time, best streaks
- **Achievement System**: Unlock badges for various accomplishments
- **Global Leaderboards**: Compete with players worldwide
- **Match History**: Review all your past games
- **Memory Meter**: Visual progress tracking based on performance

### 🛡️ Admin & Moderation

- **Admin Dashboard**: Manage users, games, and system settings
- **Report/Block System**: Handle toxic behavior
- **Live Game Monitoring**: View active rooms and player stats
- **Content Moderation**: Flag inappropriate usernames or behavior

### 🎨 User Experience

- **Dark/Light Mode**: Seamless theme switching with Tailwind CSS
- **Responsive Design**: Works perfectly on all devices
- **Smooth Animations**: Enhanced with Framer Motion
- **Real-time Updates**: Live game state synchronization

## 🛠️ Tech Stack

### Backend

- **Node.js** with **Express.js**
- **Socket.IO** for real-time communication
- **MongoDB** with **Mongoose** ODM
- **JWT** authentication
- **bcryptjs** for password hashing
- **JavaScript ES6+** with ES modules

### Frontend

- **React 18** with **JSX**
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Socket.IO Client** for real-time features
- **React Router** for navigation
- **Axios** for HTTP requests
- **Framer Motion** for animations

### Development Tools

- **Nodemon** for auto-restart
- **PostCSS** with **Autoprefixer**
- **ESLint** for code quality (optional)

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (local or Atlas)
- **npm** or **yarn**

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
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
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
   # If using local MongoDB
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
├── client/                 # React Frontend (JSX)
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   │   ├── layout/     # Navigation, layout components
│   │   │   └── game/       # Game-specific components
│   │   ├── contexts/       # React Context providers
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Client-side utilities
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # React entry point
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env
├── server/                 # Node.js Backend (JavaScript)
│   ├── src/
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # Express API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── socket/         # Socket.IO handlers
│   │   ├── utils/          # Server-side utilities
│   │   └── index.js        # Server entry point
│   ├── package.json
│   └── .env
└── README.md
```

## 🎮 How to Play

### Basic Rules

1. **Join a Game**: Enter a public room or create a private one
2. **Match Cards**: Take turns flipping two cards to find matching pairs
3. **Score Points**: Earn points for successful matches
4. **Use Power-Ups**: Strategically activate special abilities
5. **Win**: Player with the most matches when all pairs are found wins

### Game Modes

- **Classic**: Traditional turn-based gameplay
- **Blitz**: Race against a 60-second timer
- **Sudden Death**: Elimination-based competitive play
- **Power-Up Frenzy**: Enhanced gameplay with special abilities

### Power-Up System

The game features a comprehensive power-up system that adds strategic depth to gameplay:

#### Available Power-ups

- **🔄 Extra Turn**: Get an additional turn after a miss
- **👁️ Peek**: Reveal all cards for 3 seconds to memorize positions
- **🔀 Swap**: Swap the positions of two cards to create favorable layouts
- **💡 Reveal One**: Permanently reveal one card to break deadlocks
- **❄️ Freeze Timer**: Freeze the timer for 10 seconds (Blitz mode only)
- **🔀 Shuffle**: Shuffle all unmatched cards to reset the board

#### Power-up Acquisition

- Power-ups can be found on cards during gameplay
- Higher chance of power-ups in "Power-Up Frenzy" mode
- Power-ups are automatically collected when matching cards with power-ups

#### Strategic Usage

- **Save power-ups** for crucial moments
- **Use Peek** when you need to remember card positions
- **Use Swap** to create favorable layouts
- **Time Freeze** is valuable in Blitz mode
- **Reveal One** helps break deadlocks
- **Shuffle** resets the board when stuck
- **Extra Turn** provides recovery after mistakes

#### Power-up UI Features

- Color-coded power-up buttons for easy identification
- Tooltips with detailed descriptions
- Power-up history tracking
- Interactive tutorial for new players
- Visual indicators on cards with power-ups

## 🏆 Achievement System

### Example Achievements

- 🥇 **First Win**: Win your first game
- 🧠 **Perfect Memory**: Complete a game without any wrong matches
- ⚡ **Speed Demon**: Win a Blitz mode game
- 🔥 **Streak Master**: Get a 5-match combo
- 🎯 **Sharpshooter**: 90%+ accuracy in a game
- 👑 **Leaderboard Top 10**: Reach top 10 global ranking

## 💾 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/guest` - Guest account creation
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Game Management

- `GET /api/game/rooms` - List public rooms
- `GET /api/game/:id` - Get specific game
- `GET /api/game/leaderboard` - Global leaderboards
- `GET /api/game/history` - User match history

### User Management

- `GET /api/user/stats` - User statistics
- `GET /api/user/:id` - Public user profile
- `PATCH /api/auth/profile` - Update user profile

### Admin (Protected)

- `GET /api/admin/stats` - System statistics
- `GET /api/admin/games` - All games management
- `GET /api/admin/users` - User management

## 🔌 Socket.IO Events

### Client → Server

- `join-room` - Join a game room
- `leave-room` - Leave current room
- `toggle-ready` - Toggle ready status
- `flip-card` - Flip a card during game
- `use-powerup` - Activate a power-up
- `send-chat` - Send chat message

### Server → Client

- `room-joined` - Confirmation of room join
- `game-state` - Updated game state
- `player-joined` / `player-left` - Player updates
- `game-started` / `game-ended` - Game lifecycle
- `chat-message` - Receive chat messages
- `powerup-activated` - Power-up notifications

## 🚀 Development Scripts

### Backend Scripts

```bash
npm run dev      # Start development server with nodemon
npm start        # Start production server
```

### Frontend Scripts

```bash
npm run dev      # Start Vite development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🌐 Deployment

### Backend (Node.js)

1. Set production environment variables
2. Start server: `npm start`

### Frontend (Static Site)

1. Build for production: `npm run build`
2. Deploy the `dist` folder to your static hosting service

### Recommended Hosting

- **Backend**: Railway, Render, Heroku, DigitalOcean
- **Frontend**: Vercel, Netlify, GitHub Pages
- **Database**: MongoDB Atlas (free tier available)

## 🔧 Configuration

### Environment Variables

**Backend** (`.env`):

- `PORT` - Server port (default: 3001)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `CLIENT_URL` - Frontend URL for CORS
- `NODE_ENV` - Environment (development/production)

**Frontend** (`.env`):

- `VITE_API_URL` - Backend API URL
- `VITE_SOCKET_URL` - Socket.IO server URL

## 🐛 Known Issues & Future Enhancements

### Current Limitations

- Game board UI is still in development
- Some admin features are placeholders
- Google OAuth needs proper setup
- Leaderboard needs real-time updates

### Planned Features

- 📱 Mobile app with React Native
- 🎨 Custom theme creation
- 🏆 Tournament system
- 🔊 Sound effects and music
- 📊 Advanced analytics dashboard
- 🌍 Internationalization (i18n)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Support

- 📧 Email: support@memorymasters.com
- 💬 Discord: [Memory Masters Community]
- 🐛 Issues: [GitHub Issues](repository-url/issues)
- 📖 Documentation: [Wiki](repository-url/wiki)

---

**Built with ❤️ by the Memory Masters team**

🚀 **Ready to test your memory? Start playing now!**
