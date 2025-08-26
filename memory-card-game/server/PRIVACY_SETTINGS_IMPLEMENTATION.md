# Privacy Settings Implementation

## 🎯 Overview

This implementation adds privacy settings functionality to the Memory Card Game, specifically focusing on the "Show Profile in Leaderboards" setting. Users can now control whether their profile appears in leaderboards and public profile views.

## 🔧 Backend Changes

### 1. User Model Updates (`src/models/User.js`)

Added `privacySettings` schema to the User model:

```javascript
privacySettings: {
  showInLeaderboards: { type: Boolean, default: true },
  allowFriendRequests: { type: Boolean, default: true },
  showOnlineStatus: { type: Boolean, default: true },
}
```

### 2. Profile Update Route (`src/routes/auth.js`)

Added `PATCH /auth/profile` endpoint to handle profile updates including privacy settings:

- **Validation**: Ensures privacy settings are valid boolean values
- **Username Updates**: Validates username uniqueness and length
- **Avatar Updates**: Validates avatar URL format
- **Privacy Settings**: Updates individual privacy settings

### 3. Leaderboard Privacy (`src/routes/game.js`)

Updated leaderboard queries to respect privacy settings:

- **Total Score Leaderboard**: Filters out users with `showInLeaderboards: false`
- **Win Rate Leaderboard**: Filters out users with `showInLeaderboards: false`
- **Games Played Leaderboard**: Filters out users with `showInLeaderboards: false`
- **Pagination**: Updated to count only users who allow leaderboard visibility

### 4. Public Profile Privacy (`src/routes/user.js`)

Updated public profile endpoint to respect privacy settings:

- **Profile Access**: Returns 404 if user has `showInLeaderboards: false`
- **Data Selection**: Includes privacy settings in database queries

## 🎨 Frontend Changes

### 1. Profile Settings UI (`src/pages/Profile.jsx`)

- **Privacy Toggle**: Single toggle for "Show Profile in Leaderboards"
- **State Management**: Manages privacy settings state
- **Save Functionality**: Saves settings to backend
- **User Feedback**: Toast notifications for success/error

### 2. Privacy Settings State

```javascript
const [privacySettings, setPrivacySettings] = useState({
  showInLeaderboards: user?.privacySettings?.showInLeaderboards ?? true,
});
```

### 3. Privacy Toggle Function

```javascript
const togglePrivacySetting = (setting) => {
  setPrivacySettings((prev) => ({
    ...prev,
    [setting]: !prev[setting],
  }));
};
```

### 4. Save Privacy Settings

```javascript
const savePrivacySettings = async () => {
  try {
    await handleApiCall(
      () => updateProfile({ privacySettings }),
      "Privacy settings updated successfully!",
      "Failed to update privacy settings"
    );
  } catch (error) {
    // Error already handled
  }
};
```

## 🧪 Testing

### Test Script (`test-privacy-settings.js`)

Comprehensive test suite that verifies:

1. **User Registration/Login**: Creates test user
2. **Privacy Settings Update**: Tests setting privacy to false
3. **Leaderboard Privacy**: Verifies user is hidden from leaderboards
4. **Profile Privacy**: Verifies public profile is inaccessible
5. **Settings Toggle**: Tests toggling privacy back to true
6. **Profile Access After Toggle**: Verifies profile becomes accessible again

### Running Tests

```bash
cd server
node test-privacy-settings.js
```

## 🔄 API Endpoints

### Profile Update

- **Method**: `PATCH`
- **Endpoint**: `/auth/profile`
- **Auth**: Required
- **Body**:
  ```javascript
  {
    "privacySettings": {
      "showInLeaderboards": boolean
    }
  }
  ```

### Get User Info

- **Method**: `GET`
- **Endpoint**: `/auth/me`
- **Auth**: Required
- **Response**: Includes `privacySettings` object

### Public Profile

- **Method**: `GET`
- **Endpoint**: `/user/:userId/profile`
- **Auth**: Not required
- **Behavior**: Returns 404 if user has `showInLeaderboards: false`

### Leaderboards

- **Method**: `GET`
- **Endpoint**: `/game/leaderboard/global`
- **Auth**: Not required
- **Behavior**: Excludes users with `showInLeaderboards: false`

## 🎯 User Experience

### Before Privacy Setting

- All users appear in leaderboards
- All public profiles are accessible
- No privacy control

### After Privacy Setting

- Users can hide from leaderboards
- Hidden users' profiles return 404
- Privacy settings persist across sessions
- Immediate feedback on setting changes

## 🔒 Privacy Features

### 1. Leaderboard Visibility

- **ON**: User appears in all leaderboards (total score, win rate, games played)
- **OFF**: User is completely hidden from leaderboards

### 2. Public Profile Access

- **ON**: Public profile is accessible via `/user/:userId/profile`
- **OFF**: Public profile returns 404 "Profile not available"

### 3. Data Protection

- Privacy settings are stored securely in database
- Settings are validated on both frontend and backend
- Changes take effect immediately

## 🚀 Future Enhancements

### Additional Privacy Options

1. **Friend Requests**: Control who can send friend requests
2. **Online Status**: Control visibility of online status
3. **Game History**: Control visibility of match history
4. **Achievements**: Control visibility of achievements

### Advanced Features

1. **Selective Privacy**: Choose specific leaderboards to appear in
2. **Temporary Privacy**: Set privacy for specific time periods
3. **Privacy Analytics**: View who has accessed your profile
4. **Privacy Notifications**: Get notified when someone tries to access hidden profile

## ✅ Verification Checklist

- [x] User can toggle privacy setting in profile
- [x] Privacy setting saves to database
- [x] User disappears from leaderboards when privacy is OFF
- [x] Public profile returns 404 when privacy is OFF
- [x] User reappears in leaderboards when privacy is ON
- [x] Public profile becomes accessible when privacy is ON
- [x] Settings persist across login sessions
- [x] Proper error handling and user feedback
- [x] All tests pass

## 📊 Database Schema

### User Collection

```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  // ... other fields
  privacySettings: {
    showInLeaderboards: Boolean (default: true),
    allowFriendRequests: Boolean (default: true),
    showOnlineStatus: Boolean (default: true)
  }
}
```

## 🔧 Configuration

### Default Values

- `showInLeaderboards`: `true` (users are visible by default)
- `allowFriendRequests`: `true` (friend requests allowed by default)
- `showOnlineStatus`: `true` (online status visible by default)

### Validation Rules

- All privacy settings must be boolean values
- Invalid values return 400 Bad Request
- Missing values use defaults

## 🎉 Summary

The privacy settings implementation provides users with control over their visibility in leaderboards and public profiles. The implementation is:

- **Secure**: Validates all inputs and protects user data
- **User-Friendly**: Simple toggle interface with immediate feedback
- **Comprehensive**: Covers leaderboards and public profiles
- **Tested**: Full test suite ensures functionality
- **Extensible**: Easy to add more privacy options in the future

Users now have full control over their privacy while maintaining a seamless gaming experience.
