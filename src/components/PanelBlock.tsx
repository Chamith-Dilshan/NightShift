import { Card } from "./ui/card";

interface PanelBlockProps {
  title: string;
  children: React.ReactNode;
}

const PanelBlock = ({ title, children }: PanelBlockProps) => {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>

      <Card className="p-4 rounded-xl bg-background">{children}</Card>
    </div>
  );
};
export default PanelBlock;
