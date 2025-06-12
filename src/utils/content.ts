import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { slugify } from './helpers';

export type BlogPost = CollectionEntry<'blog'>;

export interface CategoryInfo {
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

// Get all published blog posts
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.publishedDate.getTime() - a.data.publishedDate.getTime());
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
  category?: string
): Promise<BlogPostsResponse> {
  let posts = await getAllBlogPosts();
  
  // Filter by category if specified
  if (category) {
    posts = posts.filter(post => 
      post.data.categories.includes(category)
    );
  }
  
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
  
  // Only allow the 4 main categories
  const allowedCategories = ['Grundlagen', 'Hilfsmittel', 'Finanzierung', 'Bildung'];
  
  const categoryMap = new Map<string, number>();
  
  posts.forEach(post => {
    post.data.categories.forEach(category => {
      if (allowedCategories.includes(category)) {
        const count = categoryMap.get(category) || 0;
        categoryMap.set(category, count + 1);
      }
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

// Get related posts
export async function getRelatedPosts(
  currentSlug: string,
  categories: string[],
  limit: number = 3
): Promise<BlogPost[]> {
  const posts = await getAllBlogPosts();
  
  return posts
    .filter(post => post.slug !== currentSlug)
    .map(post => {
      let score = 0;
      
      // Score for matching categories (increased weight since tags are removed)
      post.data.categories.forEach(category => {
        if (categories.includes(category)) {
          score += 5; // Increased from 3 to 5
        }
      });
      
      // Additional scoring for same primary category
      if (categories.length > 0 && post.data.categories.includes(categories[0])) {
        score += 2; // Extra points for same primary category
      }
      
      return { post, score };
    })
    .sort((a, b) => b.score - a.score || 
      b.post.data.publishedDate.getTime() - a.post.data.publishedDate.getTime()
    )
    .slice(0, limit)
    .map(({ post }) => post);
}