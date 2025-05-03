export function createSelfDestructMessage(message, ttlSeconds, onExpire) {
    const timerId = setTimeout(() => {
      onExpire();
    }, ttlSeconds * 1000);
  
    return {
      message,
      expiresIn: ttlSeconds,
      cancel: () => clearTimeout(timerId),
    };
  }
  