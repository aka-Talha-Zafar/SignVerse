const FloatingOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div
      className="orb w-[500px] h-[500px] bg-primary/20 top-[-10%] left-[-10%]"
      style={{ animationDelay: "0s" }}
    />
    <div
      className="orb w-[400px] h-[400px] bg-glow/15 top-[20%] right-[-5%]"
      style={{ animationDelay: "5s" }}
    />
    <div
      className="orb w-[300px] h-[300px] bg-primary/10 bottom-[10%] left-[30%]"
      style={{ animationDelay: "10s" }}
    />
    {/* Particles */}
    {Array.from({ length: 12 }).map((_, i) => (
      <div
        key={i}
        className="particle"
        style={{
          left: `${10 + (i * 7) % 80}%`,
          top: `${60 + (i * 11) % 40}%`,
          animationDelay: `${i * 0.7}s`,
          animationDuration: `${6 + (i % 4) * 2}s`,
        }}
      />
    ))}
  </div>
);

export default FloatingOrbs;
