import Link from "next/link";
import { HomeIcon, SearchIcon, ShuffleIcon, ChartIcon, UserIcon } from "./icons";

const items = [
  { label: "Home", Icon: HomeIcon, href: "/", active: true },
  { label: "Explore", Icon: SearchIcon, href: "/", active: false },
  { label: "Random", Icon: ShuffleIcon, href: "/random", active: false },
  { label: "Stats", Icon: ChartIcon, href: "/stats", active: false },
  { label: "Profile", Icon: UserIcon, href: "/", active: false },
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
      {items.map(({ label, Icon, href, active }) => {
        // /random is a redirect: the client router can replay it from cache and
        // land on the same post twice, so it needs a real navigation. Same
        // reason as the button on the status page.
        const Nav = href === "/random" ? "a" : Link;
        return (
          <Nav
            href={href}
            key={label}
            className={`nav-item${active ? " active" : ""}`}
          >
            <Icon />
            <span className="nav-label">{label}</span>
          </Nav>
        );
      })}
    </nav>
  );
}
