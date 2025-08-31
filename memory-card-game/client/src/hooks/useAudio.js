import { useRef, useEffect } from "react";

// Audio file paths from public directory
const audioUrls = {
  turn: "/audio/turn-notification.wav",
  matchFound: "/audio/match-found-notification.wav",
  gameCompletion: "/audio/game-completion-notification.wav",
  powerUp: "/audio/power-up-notification.wav",
  flipCard: "/audio/flipcard-sound.mp3",
  message: "/audio/message-notification.mp3",
};

export const useAudio = () => {
  const audioRefs = useRef({
    turn: null,
    matchFound: null,
    gameCompletion: null,
    powerUp: null,
    flipCard: null,
    message: null,
  });

  // Initialize audio objects with better error handling
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        // Create audio objects with proper error handling
        Object.keys(audioUrls).forEach((key) => {
          const audio = new Audio();

          // Set audio properties for better compatibility
          audio.preload = "auto";
          audio.volume = 0.5;

          // Handle load events
          audio.addEventListener("loadstart", () => {
            console.log(`Loading audio: ${key}`);
          });

          audio.addEventListener("canplaythrough", () => {
            console.log(`Audio loaded successfully: ${key}`);
          });

          audio.addEventListener("error", (e) => {
            console.error(`Error loading audio ${key}:`, e);
          });

          // Set the source
          audio.src = audioUrls[key];

          // Store the audio object
          audioRefs.current[key] = audio;
        });
      } catch (error) {
        console.error("Error initializing audio:", error);
      }
    };

    initializeAudio();

    // Cleanup function
    return () => {
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.src = "";
        }
      });
    };
  }, []);

  const playAudio = (audioKey) => {
    try {
      const audio = audioRefs.current[audioKey];
      if (audio && audio.readyState >= 2) {
        // HAVE_CURRENT_DATA or higher
        // Reset and play
        audio.currentTime = 0;
        audio.play().catch((error) => {
          console.error(`Error playing ${audioKey} audio:`, error);
          // Retry once after a short delay
          setTimeout(() => {
            try {
              audio.currentTime = 0;
              audio.play().catch((retryError) => {
                console.error(
                  `Retry failed for ${audioKey} audio:`,
                  retryError
                );
              });
            } catch (retryError) {
              console.error(`Retry error for ${audioKey} audio:`, retryError);
            }
          }, 100);
        });
      } else {
        console.warn(
          `Audio ${audioKey} not ready yet, readyState: ${audio?.readyState}`
        );
        // Try to load the audio if it's not ready
        if (audio && audio.readyState === 0) {
          // HAVE_NOTHING
          audio.load();
        }
      }
    } catch (error) {
      console.error(`Error in playAudio for ${audioKey}:`, error);
    }
  };

  const playTurnNotification = () => playAudio("turn");
  const playMatchFoundNotification = () => playAudio("matchFound");
  const playGameCompletionNotification = () => playAudio("gameCompletion");
  const playPowerUpNotification = () => playAudio("powerUp");
  const playFlipCardNotification = () => playAudio("flipCard");
  const playMessageNotification = () => playAudio("message");

  return {
    playTurnNotification,
    playMatchFoundNotification,
    playGameCompletionNotification,
    playPowerUpNotification,
    playFlipCardNotification,
    playMessageNotification,
  };
};
