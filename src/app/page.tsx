"use client";

import { FireflyField } from "@/components/FireFlyField";
import CyberBackground from "../components/CyberBackground";
import { GlitchButton } from "../components/GlitchButton";

export default function Home() {
  return (
    <main className="cyber-root">
      <CyberBackground />

      <div className="cyber-content">
        <FireflyField width={600} height={200} count={4}>
          <h1 className="neo-title">NIGHTSHIFT</h1>
          <p className="text-xl text-center text-brand-500-dark dark:text-brand-50">
            Media Processing Tool
          </p>
        </FireflyField>

        <div className="cyber-tools">
          <GlitchButton className="sm:w-fit w-full sm:min-w-96">
            Video Tool
          </GlitchButton>
          <GlitchButton className="sm:w-fit w-full sm:min-w-96">
            Image Tool
          </GlitchButton>
          <GlitchButton className="sm:w-fit w-full sm:min-w-96">
            ⚙ Custom Command
          </GlitchButton>
        </div>
      </div>
    </main>
  );
}
