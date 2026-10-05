"use client";

const CyberBackground = () => {
  return (
    <div
      className="absolute inset-0 bg-background"
      style={{
        background:
          "radial-gradient(circle at center, var(--background), color-mix(in srgb, var(--primary) 20%, var(--background)) 70%)",
      }}
    >
      <div className="cyber-grid" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, color-mix(in srgb, var(--foreground) 18%, transparent) 0%, color-mix(in srgb, var(--primary) 12%, transparent) 45%, transparent 75%)",
        }}
      />
    </div>
  );
};

export default CyberBackground;
