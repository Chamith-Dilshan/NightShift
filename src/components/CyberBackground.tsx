"use client";

const CyberBackground = () => {
  return (
    <div
      className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-brand-50),#e9d5ff_70%)]
dark:bg-[radial-gradient(circle_at_center,var(--color-brand-50-dark),#000_70%)]"
    >
      <div className="cyber-grid" />
      <div
        className="
absolute inset-0
bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.85)_0%,rgba(255,255,255,0.65)_20%,rgba(139,92,246,0.18)_45%,transparent_75%)]
dark:bg-[radial-gradient(circle_at_center,rgba(184,108,255,0.22)_0%,transparent_65%)]
"
      />
    </div>
  );
};

export default CyberBackground;
