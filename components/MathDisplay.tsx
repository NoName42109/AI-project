import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathDisplayProps {
  latex: string;
  block?: boolean;
}

const MathDisplay: React.FC<MathDisplayProps> = ({ latex, block = false }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(latex, containerRef.current, {
          throwOnError: false,
          displayMode: block,
        });
      } catch (error) {
        console.error("KaTeX error:", error);
        containerRef.current.innerText = latex;
      }
    }
  }, [latex, block]);

  return <span ref={containerRef} />;
};

export default MathDisplay;
