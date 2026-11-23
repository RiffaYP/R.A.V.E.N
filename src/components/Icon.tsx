export type IconName =
  | "bolt"
  | "headphone"
  | "chevronLeft"
  | "chevronRight"
  | "settings"
  | "wifi"
  | "bluetooth"
  | "keyboard"
  | "volume"
  | "sun"
  | "music"
  | "edit"
  | "check"
  | "plus"
  | "trash"
  | "copy"
  | "pin"
  | "refresh"
  | "file"
  | "timer"
  | "cpu"
  | "wrench"
  | "prayer"
  | "droplet"
  | "cloud"
  | "languages"
  | "calendar";

const PATHS: Record<IconName, React.ReactNode> = {
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />,
  headphone: (
    <>
      <path d="M4 14a8 8 0 0 1 16 0" />
      <path d="M4 14h3v6H6a2 2 0 0 1-2-2v-4zM20 14h-3v6h1a2 2 0 0 0 2-2v-4z" />
    </>
  ),
  chevronLeft: <path d="M15 5l-7 7 7 7" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  wifi: (
    <>
      <path d="M3 9a15 15 0 0 1 18 0M6.5 12.5a10 10 0 0 1 11 0M10 16a5 5 0 0 1 4 0" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  bluetooth: <path d="M7 7l10 10-5 4V3l5 4L7 17" />,
  keyboard: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M18 10h.01M8 14h8" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9h3l4-3v12l-4-3H4V9z" />
      <path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l10-2v13" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L20 8l-4-4L4 16v4z" />
      <path d="M14 6l4 4" />
    </>
  ),
  check: <path d="M5 12l4.5 4.5L19 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  copy: (
    <>
      <rect x="8" y="8" width="11" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" />
    </>
  ),
  pin: <path d="M9 4h6l-1 5 3 3v2h-4v6h-2v-6H7v-2l3-3-1-5z" />,
  refresh: <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4" />,
  file: (
    <>
      <path d="M6 3h7l5 5v13H6V3z" />
      <path d="M13 3v5h5" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 9v4l2.5 1.5M9 3h6M12 3v3" />
    </>
  ),
  cpu: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1" />
      <path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" />
    </>
  ),
  wrench: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.2 2.2-2.1-2.1 2.3-2.1z" />,
  prayer: <path d="M8 20v-5M16 20v-5M6 11c0-2 1.3-4 3-4 1.2 0 2.2.8 3 2 .8-1.2 1.8-2 3-2 1.7 0 3 2 3 4M8 15c-2 0-3-1.2-3-3M16 15c2 0 3-1.2 3-3M12 9v11" />,
  droplet: <path d="M12 3s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11z" />,
  cloud: (
    <path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9z" />
  ),
  languages: <path d="M4 5h8M8 3v2c0 4-2 7-5 9M5 9c1.5 2 3.5 3.5 6 4.5M14 20l4-10 4 10M15.5 17h5" />,
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
};

export default function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
