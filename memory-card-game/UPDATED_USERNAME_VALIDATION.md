# Updated Username Validation

## 🎯 Overview

Updated username validation to provide a better user experience with the following improvements:

- **Active Typing Detection**: Only show availability when user is actively typing
- **Minimum 4 Characters**: Username must be at least 4 characters long
- **Character Restrictions**: Only letters, numbers, hyphens (-), and underscores (\_) allowed
- **Real-time Feedback**: Immediate validation with visual indicators

## 🔧 Backend Changes

### 1. Updated Username Availability Endpoint

```javascript
// Check username availability - NO AUTH REQUIRED
router.get("/check-username/:username", async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || username.trim().length < 4) {
      return res.status(400).json({
        available: false,
        message: "Username must be at least 4 characters long",
      });
    }

    // Check for valid characters (letters, numbers, hyphens, underscores only)
    const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validUsernameRegex.test(username.trim())) {
      return res.status(400).json({
        available: false,
        message:
          "Username can only contain letters, numbers, hyphens (-), and underscores (_)",
      });
    }

    const trimmedUsername = username.trim();

    // Check if username exists
    const existingUser = await User.findOne({ username: trimmedUsername });

    res.status(200).json({
      available: !existingUser,
      message: existingUser
        ? "Username is already taken"
        : "Username is available",
    });
  } catch (error) {
    console.error("Username check error:", error);
    res.status(500).json({
      available: false,
      message: "Error checking username availability",
    });
  }
});
```

### 2. Updated Registration Validation

```javascript
if (username.length < 4) {
  return res.status(400).json({
    message: "Username must be at least 4 characters long",
  });
}

// Check for valid characters (letters, numbers, hyphens, underscores only)
const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
if (!validUsernameRegex.test(username)) {
  return res.status(400).json({
    message:
      "Username can only contain letters, numbers, hyphens (-), and underscores (_)",
  });
}
```

### 3. Updated Profile Update Validation

```javascript
if (typeof username !== "string" || username.trim().length < 4) {
  return res.status(400).json({
    message: "Username must be at least 4 characters long",
  });
}

// Check for valid characters (letters, numbers, hyphens, underscores only)
const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
if (!validUsernameRegex.test(username.trim())) {
  return res.status(400).json({
    message:
      "Username can only contain letters, numbers, hyphens (-), and underscores (_)",
  });
}
```

## 🎨 Frontend Changes

### 1. Enhanced Username Validation Hook

```javascript
const useUsernameValidation = (initialUsername = "") => {
  const [username, setUsername] = useState(initialUsername);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [message, setMessage] = useState("");
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimer, setTypingTimer] = useState(null);

  // Debounced username check
  const checkUsernameAvailability = useCallback(async (usernameToCheck) => {
    if (!usernameToCheck || usernameToCheck.trim().length < 4) {
      setIsAvailable(null);
      setMessage("");
      return;
    }

    // Check for valid characters (letters, numbers, hyphens, underscores only)
    const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validUsernameRegex.test(usernameToCheck.trim())) {
      setIsAvailable(false);
      setMessage(
        "Username can only contain letters, numbers, hyphens (-), and underscores (_)"
      );
      return;
    }

    setIsChecking(true);
    try {
      const response = await axios.get(
        `/auth/check-username/${encodeURIComponent(usernameToCheck.trim())}`
      );
      setIsAvailable(response.data.available);
      setMessage(response.data.message);
    } catch (error) {
      setIsAvailable(false);
      setMessage(
        error.response?.data?.message || "Error checking username availability"
      );
    } finally {
      setIsChecking(false);
    }
  }, []);

  const updateUsername = (newUsername) => {
    setUsername(newUsername);

    // Set typing state
    setIsTyping(true);

    // Clear existing typing timer
    if (typingTimer) {
      clearTimeout(typingTimer);
    }

    // Set new typing timer (2 seconds of inactivity to stop showing availability)
    const timer = setTimeout(() => {
      setIsTyping(false);
      setIsAvailable(null);
      setMessage("");
    }, 2000);

    setTypingTimer(timer);
  };

  return {
    username,
    updateUsername,
    isChecking,
    isAvailable,
    message,
    resetValidation,
    isValid: isAvailable === true,
    hasError: isAvailable === false,
    isTyping,
  };
};
```

### 2. Updated Profile Component

```javascript
{
  editingProfile && usernameValidation.isTyping && (
    <div className='mt-1'>
      {usernameValidation.isChecking && (
        <p className='text-sm text-blue-600 dark:text-blue-400'>
          Checking username availability...
        </p>
      )}
      {usernameValidation.message && (
        <p
          className={`text-sm ${
            usernameValidation.isValid
              ? "text-green-600 dark:text-green-400"
              : usernameValidation.hasError
              ? "text-red-600 dark:text-red-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {usernameValidation.message}
        </p>
      )}
    </div>
  );
}
```

### 3. Updated Register Component

```javascript
{
  usernameValidation.isTyping && (
    <>
      {usernameValidation.isChecking && (
        <p className='text-sm text-blue-600 dark:text-blue-400 mt-1'>
          Checking username availability...
        </p>
      )}
      {usernameValidation.message && (
        <p
          className={`text-sm mt-1 ${
            usernameValidation.isValid
              ? "text-green-600 dark:text-green-400"
              : usernameValidation.hasError
              ? "text-red-600 dark:text-red-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {usernameValidation.message}
        </p>
      )}
    </>
  );
}
```

## 🎨 User Experience Features

### 1. Active Typing Detection

- **Typing State**: Tracks when user is actively typing
- **Auto-hide**: Hides validation messages after 2 seconds of inactivity
- **Real-time Feedback**: Shows validation only during active typing

### 2. Enhanced Validation Rules

- **Minimum Length**: 4 characters required
- **Valid Characters**: Only letters, numbers, hyphens (-), and underscores (\_)
- **Real-time Validation**: Immediate feedback on character restrictions

### 3. Visual Indicators

- **Green Border**: Username is available and valid
- **Red Border**: Username is taken, invalid, or too short
- **Blue Text**: Checking availability
- **Conditional Display**: Only shows when actively typing

## 🔄 Validation Flow

### 1. Character Validation

```
Input: "test@user"
↓
Validation: Invalid characters detected
↓
Message: "Username can only contain letters, numbers, hyphens (-), and underscores (_)"
```

### 2. Length Validation

```
Input: "abc"
↓
Validation: Too short (less than 4 characters)
↓
Message: "Username must be at least 4 characters long"
```

### 3. Availability Check

```
Input: "testuser123"
↓
Validation: Valid format, check availability
↓
API Call: /auth/check-username/testuser123
↓
Response: Available or taken
```

### 4. Active Typing Detection

```
User starts typing
↓
isTyping = true
↓
Show validation messages
↓
User stops typing for 2 seconds
↓
isTyping = false
↓
Hide validation messages
```

## 🧪 Testing

### Updated Test Cases

1. **Short Username Test**: `abc` (should fail - less than 4 characters)
2. **Invalid Characters Test**: `test@user` (should fail - invalid characters)
3. **Valid Format Test**: `test-user_123` (should pass - valid format)
4. **Availability Test**: Check if username exists in database
5. **Active Typing Test**: Verify messages only show during typing

### Running Tests

```bash
cd server
node test-username-validation.js
```

## ✅ Benefits

### 1. Better User Experience

- **Less Clutter**: Validation messages only show when needed
- **Clear Feedback**: Immediate validation of character restrictions
- **Intuitive Flow**: Natural typing experience

### 2. Improved Validation

- **Stricter Rules**: Better username quality with character restrictions
- **Consistent Length**: Minimum 4 characters ensures meaningful usernames
- **Real-time Feedback**: Users know immediately if format is valid

### 3. Performance

- **Reduced API Calls**: Only check availability when actively typing
- **Auto-cleanup**: Messages disappear automatically
- **Efficient Validation**: Client-side character validation before API calls

## 🎉 Summary

The updated username validation provides:

- **Active typing detection** with auto-hide functionality
- **Minimum 4 characters** requirement
- **Character restrictions** (letters, numbers, hyphens, underscores only)
- **Real-time validation** with immediate feedback
- **Cleaner UI** with conditional message display
- **Better user experience** with intuitive validation flow

Users now get immediate feedback on username format requirements and availability, but only when they're actively typing, creating a cleaner and more intuitive experience.
