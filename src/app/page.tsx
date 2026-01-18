"use client";

import CyberBackground from "./components/CyberBackground";
import { GlitchButton } from "./components/GlitchButton";

export default function Home() {
  return (
    <main className="cyber-root">
      <CyberBackground />

      <div className="cyber-content">
        {/* <FireflyField width={500} height={400} count={4}>
          <h1 className="cyber-title flicker">NIGHTSHIFT</h1>
        </FireflyField> */}
        <h1 className="neo-title">NIGHTSHIFT</h1>
        <p className="text-xl text-purple-main">Media Processing Tool</p>

        <div className="cyber-tools">
          <GlitchButton
            glitchColors={{ primary: "#7a6cff", secondary: "#b86cff" }}
            className="sm:w-fit w-full sm:min-w-96"
          >
            Video Tool
          </GlitchButton>
          <GlitchButton
            glitchColors={{ primary: "#7a6cff", secondary: "#b86cff" }}
            className="sm:w-fit w-full sm:min-w-96"
          >
            Image Tool
          </GlitchButton>
          <GlitchButton
            glitchColors={{ primary: "#7a6cff", secondary: "#b86cff" }}
            className="sm:w-fit w-full sm:min-w-96"
          >
            ⚙ Custom Command
          </GlitchButton>
        </div>
      </div>
    </main>
  );
}
