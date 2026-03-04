import { useState, useEffect, useMemo } from "react";
import { Sun, Moon } from "lucide-react";

function getGreeting(hour) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

export const Greeting = ({ name }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const hour = time.getHours();
  const greeting = useMemo(() => getGreeting(hour), [hour]);
  const isDay = hour >= 6 && hour < 18;

  const formattedTime = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {isDay ? (
          <Sun className="h-5 w-5 text-yellow-500" />
        ) : (
          <Moon className="h-5 w-5 text-indigo-400" />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">
            {greeting}, {name}
          </span>
          <span className="text-xs text-gray-500">{formattedTime}</span>
        </div>
      </div>
    </div>
  );
};

