// Set ikon HitungHemat: satu gaya (garis bulat 2,2px, 24×24) agar mudah dikenali dan konsisten.
const PATHS = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h5v-5h3v5h5V9.5',
  start: 'M5 21V4M5 4h12l-2.5 4L17 12H5',
  book: 'M4 5.5C7 4 9.5 4 12 6c2.5-2 5-2 8-.5V19c-3-1.5-5.5-1.5-8 .5-2.5-2-5-2-8-.5zM12 6v13.5',
  cart: 'M3 4h2.5l2.2 10.5h10.6L20.5 7H6.6M9.5 19.5h.01M17 19.5h.01',
  quiz: 'M8 4h8v3H8zM6 5.5H5v15h14v-15h-1M8.5 12l2 2 4-4M8.5 17h7',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  map: 'M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4zM9 4v13M15 6.5v13',
};

export default function Icon({ name, size = 24, className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`icon ${className}`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
