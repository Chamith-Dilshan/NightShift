
interface Props {
  width: number;
  height: number;
  count?: number;
  children: React.ReactNode;
};

export function FireflyField({ width, height, count = 5, children }: Props) {
  return (
    <div
      className="firefly-field"
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      <div className="firefly-center">{children}</div>

      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="firefly"
          style={{ "--i": i } as React.CSSProperties}
        />
      ))}
    </div>
  );
}


