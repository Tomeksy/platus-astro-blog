import type { APIRoute } from 'astro';
import { getPaginatedBlogPosts } from '../../utils/content';

export const GET: APIRoute = async ({ url }) => {
  const searchParams = url.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const category = searchParams.get('category') || undefined;
  const tag = searchParams.get('tag') || undefined;
  const search = searchParams.get('search') || undefined;
  const sort = searchParams.get('sort') || 'newest';
  
  try {
    const { posts, pagination } = await getPaginatedBlogPosts(
      page,
      12, // 12 posts per page for infinite scroll
      category,
      tag,
      search,
      sort
    );
    
    // Transform posts to include only necessary data for client-side rendering
    const transformedPosts = posts.map(post => ({
      slug: post.slug,
      title: post.data.title,
      description: post.data.description,
      publishedDate: post.data.publishedDate.toISOString(),
      coverImage: post.data.coverImage,
      imageAlt: post.data.imageAlt,
      categories: post.data.categories,
      tags: post.data.tags,
      body: post.body
    }));
    
    return new Response(JSON.stringify({
      posts: transformedPosts,
      pagination
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch blog posts' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};