interface LogoProps {
  className?: string;
}

export default function Logo({ className = "h-14 w-auto" }: LogoProps) {
  return <img src="https://kelosocial.sirv.com/logo.png" alt="Kelo Social" className={className} />;
}
