 export default function Divider() {
    return (
      <div className="relative w-full h-[2px] sm:h-[3px] ">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-700 blur-sm opacity-90 rounded-full"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-700 rounded-full"></div>
      </div>
    );
  }