export type NavLink = {
  label: string;
  href: string;
};

export const primaryNav: NavLink[] = [
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export const footerColumns: { title: string; links: NavLink[] }[] = [
  {
    title: 'Services',
    links: [
      { label: 'Services', href: '/services' },
      { label: 'Discovery call', href: 'https://calendar.app.google/MP4w31TVxQ2G18T58' },
      { label: 'What’s new', href: '/changelog' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
  {
    title: 'Connect',
    links: [{ label: 'GitHub', href: 'https://github.com/singleton-sd' }],
  },
];

/** Primary CTA — Software Discovery Call */
export const appCta = {
  label: 'Book a Software Discovery Call',
  href: 'https://calendar.app.google/MP4w31TVxQ2G18T58',
};
