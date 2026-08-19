import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 18 18',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconHome(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1" />
      <rect x="10" y="2.5" width="5.5" height="5.5" rx="1" />
      <rect x="2.5" y="10" width="5.5" height="5.5" rx="1" />
      <rect x="10" y="10" width="5.5" height="5.5" rx="1" />
    </svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="3.5" width="13" height="12" rx="2" />
      <line x1="2.5" y1="7" x2="15.5" y2="7" />
      <line x1="6" y1="1.8" x2="6" y2="4.5" />
      <line x1="12" y1="1.8" x2="12" y2="4.5" />
    </svg>
  );
}

export function IconClients(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="6" r="3" />
      <path d="M3.5 15.5c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5" />
    </svg>
  );
}

export function IconServices(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <line x1="3" y1="5.5" x2="15" y2="5.5" />
      <line x1="3" y1="9" x2="15" y2="9" />
      <line x1="3" y1="12.5" x2="11" y2="12.5" />
    </svg>
  );
}

export function IconStock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 6l6.5-3.2L15.5 6v6L9 15.2 2.5 12z" />
      <line x1="2.5" y1="6" x2="9" y2="9" />
      <line x1="15.5" y1="6" x2="9" y2="9" />
      <line x1="9" y1="9" x2="9" y2="15.2" />
    </svg>
  );
}

export function IconSales(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 2.5l6 6-7 7-6-6v-7z" />
      <circle cx="6" cy="6" r="1.3" />
    </svg>
  );
}

export function IconTreasury(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="4.5" width="13" height="9" rx="2" />
      <circle cx="9" cy="9" r="2" />
    </svg>
  );
}

export function IconStats(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <line x1="4" y1="15" x2="4" y2="9" />
      <line x1="9" y1="15" x2="9" y2="4" />
      <line x1="14" y1="15" x2="14" y2="11" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="9" r="2.6" />
      <path d="M9 1.8v2.2M9 14v2.2M1.8 9h2.2M14 9h2.2M3.9 3.9l1.6 1.6M12.5 12.5l1.6 1.6M14.1 3.9l-1.6 1.6M5.5 12.5l-1.6 1.6" />
    </svg>
  );
}

export function IconSuppliers(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="7" width="9" height="7" rx="1.5" />
      <path d="M11.5 9.5h2.3l2.2 2.4v2.1h-4.5" />
      <circle cx="5.5" cy="15.2" r="1.3" />
      <circle cx="12.5" cy="15.2" r="1.3" />
    </svg>
  );
}

export function IconPurchaseOrders(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="2.8" width="11" height="13.4" rx="1.5" />
      <path d="M6.5 2.8V2c0-.4.3-.7.7-.7h3.6c.4 0 .7.3.7.7v.8" />
      <line x1="6" y1="7.2" x2="12" y2="7.2" />
      <line x1="6" y1="10" x2="12" y2="10" />
      <line x1="6" y1="12.8" x2="9.5" y2="12.8" />
    </svg>
  );
}

export function IconReports(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="2.5" width="12" height="13" rx="1.5" />
      <line x1="6" y1="10.5" x2="6" y2="12.5" />
      <line x1="9" y1="8.5" x2="9" y2="12.5" />
      <line x1="12" y1="6.5" x2="12" y2="12.5" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="6.5" cy="6" r="2.6" />
      <path d="M2 15c0-2.6 2-4 4.5-4s4.5 1.4 4.5 4" />
      <circle cx="13" cy="6.6" r="2" />
      <path d="M11.8 7.2c1.9.2 3.2 1.5 3.2 3.6" />
    </svg>
  );
}

export function IconSchedule(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="9.5" r="6.3" />
      <path d="M9 6v3.6l2.6 1.6" />
      <line x1="6.8" y1="1.6" x2="11.2" y2="1.6" />
    </svg>
  );
}

export function IconBusiness(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.8 6.5L4 2.8h10l1.2 3.7" />
      <path d="M2.8 6.5v8.2h12.4V6.5" />
      <path d="M2.8 6.5c.2 1.4 1.3 2.3 2.6 2.3s2.4-.9 2.6-2.3c.2 1.4 1.3 2.3 2.6 2.3s2.4-.9 2.6-2.3" />
      <line x1="7.5" y1="14.7" x2="7.5" y2="10.5" />
      <line x1="10.5" y1="14.7" x2="10.5" y2="10.5" />
    </svg>
  );
}

export function IconPlan(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 1.8l2.1 4.4 4.7.6-3.5 3.3.9 4.8-4.2-2.3-4.2 2.3.9-4.8-3.5-3.3 4.7-.6z" />
    </svg>
  );
}

export function IconCatalog(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="3" width="13" height="4" rx="1.3" />
      <rect x="2.5" y="8.5" width="13" height="4" rx="1.3" />
      <line x1="5" y1="5" x2="8" y2="5" />
      <line x1="5" y1="10.5" x2="8" y2="10.5" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 7.5c0-2.2 1.8-4 4-4s4 1.8 4 4v3.2l1.5 2.8h-11l1.5-2.8z" />
      <path d="M7.5 14.5c0 .9.7 1.6 1.5 1.6s1.5-.7 1.5-1.6" />
    </svg>
  );
}

export function IconScissors(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="4.5" cy="5" r="1.8" />
      <circle cx="4.5" cy="13" r="1.8" />
      <line x1="6" y1="6.2" x2="15.5" y2="15.5" />
      <line x1="6" y1="11.8" x2="15.5" y2="2.5" />
    </svg>
  );
}

export function IconDiscount(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 9.5V4.5a1.5 1.5 0 0 1 1.5-1.5h5L15 8.5a1.5 1.5 0 0 1 0 2.1l-4.4 4.4a1.5 1.5 0 0 1-2.1 0L3 9.5Z" />
      <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMore(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="4.5" cy="9" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="9" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <line x1="4" y1="4" x2="14" y2="14" />
      <line x1="14" y1="4" x2="4" y2="14" />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 2.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 15.5h3" />
      <line x1="15.5" y1="9" x2="7.5" y2="9" />
      <path d="M12.5 5.5L15.5 9l-3 3.5" />
    </svg>
  );
}

export function IconExternal(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7.5 3.5h-3A1.5 1.5 0 0 0 3 5v8A1.5 1.5 0 0 0 4.5 14.5h8A1.5 1.5 0 0 0 14 13v-3" />
      <path d="M10 2.5h4.5V7" />
      <line x1="14.5" y1="2.5" x2="8" y2="9" />
    </svg>
  );
}
