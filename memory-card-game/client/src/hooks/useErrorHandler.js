import { useCallback } from "react";
import { useToast } from "../contexts/ToastContext.jsx";

const useErrorHandler = () => {
  const { addToast } = useToast();

  const handleError = useCallback(
    (error, customMessage = null) => {
      console.error("Error occurred:", error);

      let message = customMessage;
      let type = "error";

      if (!customMessage) {
        if (error.response) {
          // API error with response
          const status = error.response.status;
          const data = error.response.data;

          switch (status) {
            case 400:
              message =
                data.message || "Invalid request. Please check your input.";
              break;
            case 401:
              message = "Authentication failed. Please log in again.";
              type = "warning";
              // Clear token and redirect to login for 401 errors
              localStorage.removeItem("token");
              window.location.href = "/login";
              break;
            case 403:
              message = "You don't have permission to perform this action.";
              type = "warning";
              break;
            case 404:
              message = "The requested resource was not found.";
              break;
            case 409:
              message =
                data.message || "Conflict: This action cannot be completed.";
              break;
            case 429:
              message = "Too many requests. Please try again later.";
              type = "warning";
              break;
            case 500:
              message = "Server error. Our team has been notified.";
              break;
            case 502:
            case 503:
            case 504:
              message = "Service temporarily unavailable. Please try again.";
              break;
            default:
              message = data.message || `An error occurred (${status})`;
          }
        } else if (error.request) {
          // Network error
          message = "Network error. Please check your internet connection.";
          type = "warning";
        } else {
          // Other error
          message = error.message || "An unexpected error occurred.";
        }
      }

      addToast(message, type);

      return { message, type, status: error.response?.status };
    },
    [addToast]
  );

  const handleSuccess = useCallback(
    (message, duration = 3000) => {
      addToast(message, "success", duration);
    },
    [addToast]
  );

  const handleWarning = useCallback(
    (message, duration = 4000) => {
      addToast(message, "warning", duration);
    },
    [addToast]
  );

  const handleInfo = useCallback(
    (message, duration = 3000) => {
      addToast(message, "info", duration);
    },
    [addToast]
  );

  // Specialized handlers for common scenarios
  const handleApiCall = useCallback(
    async (apiCall, successMessage = null, errorMessage = null) => {
      try {
        const result = await apiCall();
        if (successMessage) {
          handleSuccess(successMessage);
        }
        return result;
      } catch (error) {
        handleError(error, errorMessage);
        throw error; // Re-throw so calling code can handle it if needed
      }
    },
    [handleError, handleSuccess]
  );

  const handleFormError = useCallback(
    (error) => {
      if (error.response?.data?.errors) {
        // Handle validation errors
        const errors = error.response.data.errors;
        if (Array.isArray(errors)) {
          errors.forEach((err) => addToast(err.message || err, "error"));
        } else if (typeof errors === "object") {
          Object.values(errors).forEach((err) => addToast(err, "error"));
        } else {
          addToast(errors, "error");
        }
      } else {
        handleError(error);
      }
    },
    [addToast, handleError]
  );

  const handleGameError = useCallback(
    (error) => {
      const gameSpecificMessages = {
        ROOM_FULL: "This game room is full. Try joining another room.",
        GAME_NOT_FOUND:
          "Game room not found. It may have ended or been removed.",
        NOT_YOUR_TURN: "Please wait for your turn to play.",
        INVALID_MOVE: "That move is not allowed. Try a different card.",
        CONNECTION_LOST: "Connection to game lost. Attempting to reconnect...",
        PLAYER_DISCONNECTED: "A player has disconnected from the game.",
        GAME_ENDED: "The game has ended.",
        UNAUTHORIZED_ACTION:
          "You're not authorized to perform this action in this game.",
      };

      const message =
        gameSpecificMessages[error.code] ||
        error.message ||
        "A game error occurred.";
      const type = ["CONNECTION_LOST", "PLAYER_DISCONNECTED"].includes(
        error.code
      )
        ? "warning"
        : "error";

      addToast(message, type);
    },
    [addToast]
  );

  return {
    handleError,
    handleSuccess,
    handleWarning,
    handleInfo,
    handleApiCall,
    handleFormError,
    handleGameError,
  };
};

export default useErrorHandler;
