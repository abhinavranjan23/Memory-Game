import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='error-boundary'>
          <div className='error-container'>
            <div className='error-icon'>🎮</div>
            <h1>Oops! Something Went Wrong</h1>
            <p>
              Our memory cards seem to have gotten scrambled! Don't worry, this
              happens to the best of us.
            </p>

            <div className='error-actions'>
              <button
                onClick={() => window.location.reload()}
                className='retry-button'
              >
                🔄 Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className='home-button'
              >
                🏠 Go To Lobby
              </button>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className='error-details'>
                <summary>Error Details (Development Mode)</summary>
                <div className='error-stack'>
                  <h3>Error:</h3>
                  <pre>{this.state.error.toString()}</pre>
                  <h3>Component Stack:</h3>
                  <pre>{this.state.errorInfo.componentStack}</pre>
                </div>
              </details>
            )}

            <div className='game-tip'>
              <h3>🎮 Game Tip:</h3>
              <p>
                Just like flipping the wrong cards in our memory game, sometimes
                code needs a second chance. Try refreshing or check your
                internet connection!
              </p>
            </div>
          </div>

          <style jsx>{`
            .error-boundary {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 2rem;
            }

            .error-container {
              max-width: 600px;
              text-align: center;
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 16px;
              padding: 3rem;
            }

            .error-icon {
              font-size: 4rem;
              margin-bottom: 1rem;
              animation: bounce 2s infinite;
            }

            @keyframes bounce {
              0%,
              20%,
              50%,
              80%,
              100% {
                transform: translateY(0);
              }
              40% {
                transform: translateY(-10px);
              }
              60% {
                transform: translateY(-5px);
              }
            }

            .error-container h1 {
              font-size: 2rem;
              margin-bottom: 1rem;
              color: #fbbf24;
            }

            .error-container p {
              font-size: 1.1rem;
              margin-bottom: 2rem;
              opacity: 0.9;
            }

            .error-actions {
              display: flex;
              gap: 1rem;
              justify-content: center;
              margin-bottom: 2rem;
            }

            .retry-button,
            .home-button {
              padding: 0.75rem 1.5rem;
              border: none;
              border-radius: 8px;
              font-size: 1rem;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.3s ease;
            }

            .retry-button {
              background: #22c55e;
              color: white;
            }

            .retry-button:hover {
              background: #16a34a;
              transform: translateY(-2px);
            }

            .home-button {
              background: rgba(255, 255, 255, 0.2);
              color: white;
              border: 1px solid rgba(255, 255, 255, 0.3);
            }

            .home-button:hover {
              background: rgba(255, 255, 255, 0.3);
              transform: translateY(-2px);
            }

            .error-details {
              margin: 2rem 0;
              text-align: left;
            }

            .error-details summary {
              cursor: pointer;
              padding: 1rem;
              background: rgba(0, 0, 0, 0.2);
              border-radius: 8px;
              margin-bottom: 1rem;
            }

            .error-stack {
              background: rgba(0, 0, 0, 0.3);
              padding: 1rem;
              border-radius: 8px;
              overflow-x: auto;
            }

            .error-stack pre {
              font-size: 0.9rem;
              line-height: 1.4;
              margin: 0.5rem 0;
            }

            .game-tip {
              margin-top: 2rem;
              padding: 1.5rem;
              background: rgba(34, 197, 94, 0.1);
              border: 1px solid rgba(34, 197, 94, 0.3);
              border-radius: 12px;
            }

            .game-tip h3 {
              color: #22c55e;
              margin-bottom: 0.5rem;
            }

            @media (max-width: 768px) {
              .error-actions {
                flex-direction: column;
                align-items: center;
              }

              .error-container {
                padding: 2rem;
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
