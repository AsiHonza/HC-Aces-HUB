/**
 * Web Push VAPID configuration.
 * Contains both environment variable lookups and built-in project defaults.
 */

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BIqKKuM64e2vLRhgtTKHQsQWdBZYFy7BStE-yQmn8q6m0Lc25ZW07qGQe3JU1uv_YL-b6e29iVh1W3dLvF-jUhE';

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  '-n8_Y-4XMZ1LOjWx9rfZoP4NWigBBtDsuhwXRt0lk9o';

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:admin@hcaces.cz';
