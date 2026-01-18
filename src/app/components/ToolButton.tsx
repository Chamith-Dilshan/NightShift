"use client";

import { useRouter } from "next/navigation";

interface Props {
  label: string;
  path: string;
}

const ToolButton = ({ label, path }: Props) => {
  const router = useRouter();

  return (
    <button onClick={() => router.push(path)} className="tool-btn">
      {label}
    </button>
  );
};

export default ToolButton;
