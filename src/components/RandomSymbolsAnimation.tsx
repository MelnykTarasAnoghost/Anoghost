"use client";

import { useState, useEffect, useRef } from "react";

interface RandomSymbolsAnimationProps {
  variant?: "matrix" | "glitch" | "typewriter" | "custom";
  length?: number;
  speed?: number;
  className?: string;
  customSymbols?: string;
}

const SYMBOL_SETS = {
  matrix:
    "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン",
  glitch: "!@#$%^&*()_+-=[]{}|;:,.<>?~`",
  typewriter: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  custom: "",
};

export function RandomSymbolsAnimation({
  variant = "matrix",
  length = 15,
  speed = 100,
  className,
  customSymbols = "",
}: RandomSymbolsAnimationProps) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getSymbolSet = () => {
    if (variant === "custom" && customSymbols) {
      return customSymbols;
    }
    return SYMBOL_SETS[variant];
  };

  const generateRandomSymbol = () => {
    const symbolSet = getSymbolSet();
    return symbolSet[Math.floor(Math.random() * symbolSet.length)];
  };

  const generateInitialSymbols = () => {
    return Array.from({ length }, () => generateRandomSymbol());
  };

  const combineClasses = (...classes: (string | boolean | undefined)[]) => {
    return classes.filter(Boolean).join(" ");
  };

  useEffect(() => {
    // Initialize symbols
    setSymbols(generateInitialSymbols());

    // Start animation
    intervalRef.current = setInterval(() => {
      setSymbols((prevSymbols) => {
        const newSymbols = [...prevSymbols];

        if (variant === "glitch") {
          // Glitch effect: change multiple random positions
          const numChanges = Math.floor(Math.random() * 3) + 1;
          for (let i = 0; i < numChanges; i++) {
            const randomIndex = Math.floor(Math.random() * length);
            newSymbols[randomIndex] = generateRandomSymbol();
          }
        } else if (variant === "typewriter") {
          // Typewriter effect: change from left to right occasionally
          const shouldChange = Math.random() > 0.7;
          if (shouldChange) {
            const randomIndex = Math.floor(Math.random() * length);
            newSymbols[randomIndex] = generateRandomSymbol();
          }
        } else {
          // Matrix and custom: change random positions
          const randomIndex = Math.floor(Math.random() * length);
          newSymbols[randomIndex] = generateRandomSymbol();
        }

        return newSymbols;
      });
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [variant, length, speed, customSymbols]);

  return (
    <div
      className={combineClasses(
        "font-mono tracking-wider select-none",
        variant === "glitch" && "animate-pulse",
        className
      )}
    >
      <span className="inline-block">
        {symbols.map((symbol, index) => (
          <span
            key={index}
            className={combineClasses(
              "inline-block transition-all duration-75",
              variant === "glitch" && index % 3 === 0 && "animate-bounce",
              variant === "typewriter" && "hover:scale-110"
            )}
            style={{
              animationDelay: variant === "glitch" ? `${index * 50}ms` : "0ms",
            }}
          >
            {symbol}
          </span>
        ))}
      </span>
    </div>
  );
}
