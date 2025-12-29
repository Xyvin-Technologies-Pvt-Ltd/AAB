import { ClockLoader } from "react-spinners";

export const Loader = ({ size = 50, color = "#4f46e5", className = "" }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <ClockLoader color={color} size={size} />
    </div>
  );
};

export const LoaderWithText = ({ 
  text = "Loading...", 
  size = 50, 
  color = "#4f46e5",
  className = "" 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <ClockLoader color={color} size={size} />
      {text && <p className="text-gray-600 text-sm">{text}</p>}
    </div>
  );
};

