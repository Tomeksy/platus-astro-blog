// Types for Airtable data

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string; // Markdown content
  publishedDate: Date;
  updatedDate?: Date;
  author: string;
  authorTitle?: string;
  authorImage?: string;
  coverImage?: string;
  imageAlt?: string;
  categories: string[];
  tags: string[];
  featured: boolean;
  status: 'draft' | 'published';
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface BlogPostsResponse {
  posts: BlogPost[];
  pagination: Pagination;
}

export interface CategoryInfo {
  name: string;
  slug: string;
  count: number;
}

export interface TagInfo {
  name: string;
  slug: string;
  count: number;
}

export interface MetaData {
  title: string;
  description: string;
  canonicalUrl?: string;
  image?: string;
  imageAlt?: string;
  author?: string;
  publishedDate?: Date;
  updatedDate?: Date;
  type?: 'website' | 'article';
}