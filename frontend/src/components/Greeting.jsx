import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export const Greeting = ({ name }) => {
  const [time, setTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
  const [isDay, setIsDay] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now);
      
      const hour = now.getHours();
      
      // Determine greeting based on time of day
      if (hour >= 5 && hour < 12) {
        setGreeting("Good morning");
      } else if (hour >= 12 && hour < 17) {
        setGreeting("Good afternoon");
      } else if (hour >= 17 && hour < 21) {
        setGreeting("Good evening");
      } else {
        setGreeting("Good night");
      }
      
      // Determine if it's day or night (6 AM - 6 PM is day)
      setIsDay(hour >= 6 && hour < 18);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

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
          <span className="text-xs text-gray-500">{formatTime(time)}</span>
        </div>
      </div>
    </div>
  );
};

