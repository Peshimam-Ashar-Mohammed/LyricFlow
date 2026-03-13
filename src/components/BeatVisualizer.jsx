import { useEffect, useRef } from 'react';

function BeatVisualizer({ beatPulse, heightClass = 'h-24' }) {
  const canvasRef = useRef(null);
  const pulseRef = useRef(0);

  useEffect(() => {
    pulseRef.current = Math.max(pulseRef.current, beatPulse);
  }, [beatPulse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return undefined;
    }

    let frameId;

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      pulseRef.current *= 0.93;
      const amplitude = 10 + pulseRef.current * 30;
      const centerY = height / 2;

      context.clearRect(0, 0, width, height);
      context.fillStyle = 'rgba(10, 10, 12, 0.45)';
      context.fillRect(0, 0, width, height);

      context.lineWidth = 2.2;
      context.strokeStyle = `rgba(101, 180, 229, ${0.45 + pulseRef.current * 0.35})`;
      context.beginPath();

      for (let x = 0; x <= width; x += 2) {
        const y = centerY + Math.sin((x + performance.now() * 0.1) * 0.04) * amplitude;
        if (x === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      context.stroke();

      context.fillStyle = `rgba(255, 95, 128, ${0.2 + pulseRef.current * 0.3})`;
      context.fillRect(0, centerY - 2, width, 4);

      frameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} className={`${heightClass} w-full rounded-md border border-white/15 bg-zinc-950/60`} />;
}

export default BeatVisualizer;
