import Link from "next/link";
import { HomeIcon, SearchIcon, UserIcon } from "./icons";

const items = [
  { label: "Home", Icon: HomeIcon, active: true },
  { label: "Explore", Icon: SearchIcon, active: false },
  { label: "Profile", Icon: UserIcon, active: false },
];

export default function LeftNav() {
  return (
    <nav className="nav" aria-label="Primary">
      <Link href="/" className="nav-brand" aria-label="Simpsons Against DevOps home">
        <img
          className="nav-brand-logo"
          src="/simpsonsops-logo.png"
          alt="Simpsons Against DevOps"
        />
      </Link>
      {items.map(({ label, Icon, active }) => (
        <Link
          href="/"
          key={label}
          className={`nav-item${active ? " active" : ""}`}
        >
          <Icon />
          <span className="nav-label">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
