// src/components/CountUp.jsx
import React, { useEffect, useState } from "react";


export default function CountUp({
  from = 0,
  to = 0,
  duration = 2,
  trigger,
  className,
}) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    let startTime = null;
    const diff = to - from;
    const durationMs = duration * 1000;

    const animate = (timestamp) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const current = Math.round(from + diff * progress);
      setValue(current);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    setValue(from);
    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [from, to, duration, trigger]);

  const formatted = value.toLocaleString();

  return <span className={className}>{formatted}</span>;
}