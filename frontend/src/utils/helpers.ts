import { format, isValid } from 'date-fns';
import de from 'date-fns/locale/de/index.js';

// Convert a string to a valid URL slug
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Format date in German locale with validation
export function formatDate(date: Date, formatString: string = 'PPP'): string {
  if (!date || !isValid(date)) {
    return 'Ungültiges Datum';
  }
  return format(date, formatString, { locale: de });
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Get reading time estimate
export function getReadingTime(text: string, wordsPerMinute: number = 200): number {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes;
}

// Generate a random ID
export function generateId(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

// Create Open Graph URL for images
export function createOgImageUrl(title: string, imageUrl?: string): string {
  if (imageUrl) return imageUrl;
  
  // Create a fallback OG image using a service like Vercel OG Image
  const encodedTitle = encodeURIComponent(title);
  return `https://og-image.vercel.app/${encodedTitle}.png?theme=light&md=1&fontSize=100px&images=https%3A%2F%2Fassets.vercel.com%2Fimage%2Fupload%2Ffront%2Fassets%2Fdesign%2Fastro-logo.png`;
}

// Get path for pagination
export function getPaginationPath(
  basePath: string,
  page: number,
  category?: string,
  tag?: string
): string {
  let path = basePath;
  
  if (category) {
    path = `/blog/category/${category}`;
  } else if (tag) {
    path = `/blog/tag/${tag}`;
  }
  
  if (page === 1) return path;
  return `${path}/page/${page}`;
}