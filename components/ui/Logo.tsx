interface LogoProps {
  className?: string;
}

export default function Logo({
  className = "h-16 w-auto object-contain select-none",
}: LogoProps) {
  return (
    <img
      src="https://kelosocial.sirv.com/logo.png"
      alt="Kelo Social"
      draggable={false}
      className={className}
    />
  );
}
