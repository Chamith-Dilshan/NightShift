type HeroTitleProps = {
  title: string;
  highlight?: string;
};

export default function HeroTitle({ title, highlight }: HeroTitleProps) {
  return (
    <section className="hero">
      <div className="hero-wrapper">
        <div className="hero-block">
          <h1 className="hero-title">
            {title}
            {highlight && <strong>{highlight}</strong>}
          </h1>
        </div>
      </div>
    </section>
  );
}
