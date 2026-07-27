import Logo from "@/components/ui/Logo";

interface AuthLayoutProps {
  title: string;
  tagline: string;
  children: React.ReactNode;
}

export default function AuthLayout({ title, tagline, children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen flex-col bg-kelo-background font-sans text-kelo-text md:flex-row">
      <div className="flex flex-col items-center justify-center border-r border-kelo-border bg-white p-12 text-center md:w-1/2">
        <Logo className="mb-8 h-28 drop-shadow-sm" />
        <h1 className="mb-4 bg-kelo-gradient bg-clip-text text-5xl font-extrabold text-transparent lg:text-6xl">
          {title}
        </h1>
        <p className="max-w-md text-xl font-medium text-kelo-muted">{tagline}</p>
      </div>

      <div className="flex items-center justify-center bg-kelo-background p-8 md:w-1/2">
        <div className="kelo-card w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}
