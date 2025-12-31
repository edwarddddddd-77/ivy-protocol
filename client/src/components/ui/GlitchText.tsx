import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

interface GlitchTextProps {
  text: string;
  className?: string;
}

export function GlitchText({ text, className }: GlitchTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let iteration = 0;

    const scramble = () => {
      interval = setInterval(() => {
        setDisplayText(prev => 
          text
            .split("")
            .map((char, index) => {
              if (index < iteration) {
                return text[index];
              }
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join("")
        );

        if (iteration >= text.length) {
          clearInterval(interval);
        }

        iteration += 1 / 3;
      }, 30);
    };

    // Initial scramble
    scramble();

    // Random glitch effect occasionally
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.9) {
        iteration = 0;
        scramble();
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(glitchInterval);
    };
  }, [text]);

  return (
    <span className={cn("font-mono", className)}>
      {displayText}
    </span>
  );
}
