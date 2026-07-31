interface ComingSoonSectionProps {
  title: string;
  items: string[];
}

export default function ComingSoonSection({ title, items }: ComingSoonSectionProps) {
  return (
    <div className="p-6">
      <div className="rounded-2xl border border-kelo-border bg-kelo-background p-6">
        <h3 className="mb-2 text-base font-extrabold text-kelo-text">{title}</h3>
        <p className="mb-4 text-sm text-kelo-muted">Cette section arrive bientôt. Ce qui est prévu :</p>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-kelo-text">
              <span className="h-1.5 w-1.5 rounded-full bg-kelo-primary" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
