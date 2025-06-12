import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { slugify } from './helpers';

export type BlogPost = CollectionEntry<'blog'>;

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

// Search function for blog posts
function searchPosts(posts: BlogPost[], query: string): BlogPost[] {
  if (!query) return posts;
  
  const searchTerm = query.toLowerCase();
  return posts.filter(post => {
    const title = post.data.title.toLowerCase();
    const description = (post.data.description || '').toLowerCase();
    const categories = post.data.categories.join(' ').toLowerCase();
    const tags = post.data.tags.join(' ').toLowerCase();
    const body = post.body.toLowerCase();
    
    return title.includes(searchTerm) ||
           description.includes(searchTerm) ||
           categories.includes(searchTerm) ||
           tags.includes(searchTerm) ||
           body.includes(searchTerm);
  });
}

// Sort function for blog posts
function sortPosts(posts: BlogPost[], sortBy: string): BlogPost[] {
  switch (sortBy) {
    case 'oldest':
      return [...posts].sort((a, b) => a.data.publishedDate.getTime() - b.data.publishedDate.getTime());
    case 'title-asc':
      return [...posts].sort((a, b) => a.data.title.localeCompare(b.data.title));
    case 'title-desc':
      return [...posts].sort((a, b) => b.data.title.localeCompare(a.data.title));
    case 'newest':
    default:
      return [...posts].sort((a, b) => b.data.publishedDate.getTime() - a.data.publishedDate.getTime());
  }
}

// Get all published blog posts
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  // Always sort by newest first (most recent at top)
  return sortPosts(posts, 'newest');
}

// Get a single blog post by slug
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const posts = await getAllBlogPosts();
  return posts.find(post => post.slug === slug);
}

// Get paginated blog posts
export async function getPaginatedBlogPosts(
  page: number = 1,
  itemsPerPage: number = 10,
  category?: string,
  tag?: string,
  search?: string,
  sort: string = 'newest'
): Promise<BlogPostsResponse> {
  let posts = await getAllBlogPosts();
  
  // Apply search filter first
  if (search) {
    posts = searchPosts(posts, search);
  }
  
  // Filter by category if specified
  if (category) {
    posts = posts.filter(post => 
      post.data.categories.some(cat => slugify(cat) === category)
    );
  }
  
  // Filter by tag if specified
  if (tag) {
    posts = posts.filter(post => 
      post.data.tags.some(t => slugify(t) === tag)
    );
  }
  
  // Apply sorting
  posts = sortPosts(posts, sort);
  
  const totalItems = posts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const offset = (page - 1) * itemsPerPage;
  
  return {
    posts: posts.slice(offset, offset + itemsPerPage),
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }
  };
}

// Get featured posts
export async function getFeaturedPosts(limit: number = 3): Promise<BlogPost[]> {
  const posts = await getAllBlogPosts();
  return posts
    .filter(post => post.data.featured)
    .slice(0, limit);
}

// Get all categories with post counts
export async function getAllCategories(): Promise<CategoryInfo[]> {
  const posts = await getAllBlogPosts();
  const categoryMap = new Map<string, number>();
  
  posts.forEach(post => {
    post.data.categories.forEach(category => {
      const count = categoryMap.get(category) || 0;
      categoryMap.set(category, count + 1);
    });
  });
  
  return Array.from(categoryMap.entries())
    .map(([name, count]) => ({
      name,
      slug: slugify(name),
      count
    }))
    .sort((a, b) => b.count - a.count);
}

// Get all tags with post counts
export async function getAllTags(): Promise<TagInfo[]> {
  const posts = await getAllBlogPosts();
  const tagMap = new Map<string, number>();
  
  posts.forEach(post => {
    post.data.tags.forEach(tag => {
      const count = tagMap.get(tag) || 0;
      tagMap.set(tag, count + 1);
    });
  });
  
  return Array.from(tagMap.entries())
    .map(([name, count]) => ({
      name,
      slug: slugify(name),
      count
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Get related posts
export async function getRelatedPosts(
  currentSlug: string,
  categories: string[],
  tags: string[],
  limit: number = 3
): Promise<BlogPost[]> {
  const posts = await getAllBlogPosts();
  
  return posts
    .filter(post => post.slug !== currentSlug)
    .map(post => {
      let score = 0;
      
      // Score for matching categories
      post.data.categories.forEach(category => {
        if (categories.includes(category)) {
          score += 3;
        }
      });
      
      // Score for matching tags
      post.data.tags.forEach(tag => {
        if (tags.includes(tag)) {
          score += 1;
        }
      });
      
      return { post, score };
    })
    .sort((a, b) => b.score - a.score || 
      b.post.data.publishedDate.getTime() - a.post.data.publishedDate.getTime()
    )
    .slice(0, limit)
    .map(({ post }) => post);
}