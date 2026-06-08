import ThemeToggle from "./ThemeToggle";
import ProfileTabs from "./ProfileTabs";
import { VerifiedBadge, CalendarIcon, LinkIcon } from "./icons";

export default function ProfileHeader() {
  return (
    <header>
      <div className="top-bar">
        <img
          className="top-bar-logo"
          src="/simpsonsops-logo.png"
          alt="Simpsons Against DevOps"
        />
        <ThemeToggle />
      </div>

      <img
        className="cover"
        src="/simpsonsops-cover.jpg"
        alt="Simpsons Against DevOps cover"
      />

      <div className="profile-body">
        <div className="profile-top-row">
          <div className="avatar-wrap">
            <img
              className="avatar"
              src="/simpsonsops-pp.jpg"
              alt="Simpsons Against DevOps avatar"
            />
          </div>
        </div>

        <h1 className="display-name">
          Simpsons Against DevOps
          <VerifiedBadge className="verified" />
        </h1>
        <div className="handle">@SimpsonsOps</div>

        <p className="bio">
          Simpsons Against DevOps | DMs Open | Send Memes | New memes posted once
          a day-ish
        </p>

        <p className="attribution">
          An archive of the @SimpsonsOps meme account. Original content by{" "}
          <a
            href="https://www.linkedin.com/in/richz/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Richard Zhang
          </a>{" "}
          and{" "}
          <a
            href="https://www.linkedin.com/in/jsimonovski/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Jordan Simonovski
          </a>
          .
        </p>

        <div className="profile-meta">
          <span className="profile-meta-item">
            <LinkIcon />
            <a
              href="https://simpsonsops.dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              simpsonsops.dev
            </a>
          </span>
          <span className="profile-meta-item">
            <CalendarIcon />
            Joined July 2020
          </span>
        </div>

        <div className="profile-stats">
          <span>
            <span className="num">362</span>{" "}
            <span className="label">Following</span>
          </span>
          <span>
            <span className="num">22.5K</span>{" "}
            <span className="label">Followers</span>
          </span>
        </div>
      </div>

      <ProfileTabs />
    </header>
  );
}
