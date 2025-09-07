import { useRef, useEffect } from "react";

const audioUrls = {
  turn: new URL("../assets/audio/turn-notification.wav", import.meta.url).href,
  matchFound: new URL(
    "../assets/audio/match-found-notification.wav",
    import.meta.url
  ).href,
  gameCompletion: new URL(
    "../assets/audio/game-completion-notification.wav",
    import.meta.url
  ).href,
  powerUp: new URL("../assets/audio/power-up-notification.wav", import.meta.url)
    .href,
  flipCard: new URL("../assets/audio/flipcard-sound.mp3", import.meta.url).href,
  message: new URL("../assets/audio/message-notification.mp3", import.meta.url)
    .href,
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

  useEffect(() => {
    const initializeAudio = async () => {
      try {
        console.log("Initializing audio with URLs:", audioUrls);

        Object.keys(audioUrls).forEach((key) => {
          const audio = new Audio();

          audio.preload = "auto";
          audio.volume = 0.5;

          audio.addEventListener("loadstart", () => {
            console.log(`Loading audio: ${key} from ${audio.src}`);
          });

          audio.addEventListener("canplaythrough", () => {
            console.log(`Audio loaded successfully: ${key}`);
          });

          audio.addEventListener("error", (e) => {
            console.error(`Error loading audio ${key}:`, e);
            console.error(`Audio src: ${audio.src}`);
            console.error(`Audio error code: ${audio.error?.code}`);
            console.error(`Audio error message: ${audio.error?.message}`);

            // If the URL got corrupted, restore the original
            if (audio._originalSrc && audio.src !== audio._originalSrc) {
              console.log(
                `Restoring original URL for ${key}: ${audio._originalSrc}`
              );
              audio.src = audio._originalSrc;
            }
          });

          audio.src = audioUrls[key];

          audio._originalSrc = audioUrls[key];

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

      if (audio && audio._originalSrc && audio.src !== audio._originalSrc) {
        console.log(
          `URL corrupted for ${audioKey}, restoring: ${audio._originalSrc}`
        );
        audio.src = audio._originalSrc;
      }

      if (audio && audio.readyState >= 2) {
        audio.currentTime = 0;
        audio
          .play()
          .then(() => {
            console.log(`Successfully started playing ${audioKey} audio`);
          })
          .catch((error) => {
            console.error(`Error playing ${audioKey} audio:`, error);
            console.error(`Audio details:`, {
              src: audio.src,
              readyState: audio.readyState,
              error: audio.error,
            });

            // Retry once after a short delay
            setTimeout(() => {
              try {
                audio.currentTime = 0;
                audio
                  .play()
                  .then(() => {
                    console.log(`Retry successful for ${audioKey} audio`);
                  })
                  .catch((retryError) => {
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

        if (audio && audio.readyState === 0) {
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
