/**
 * Mixpost API Client
 * 
 * Handles all interactions with the Mixpost API
 */

interface MixpostAccount {
  id: string;
  provider: string;
  name: string;
  username: string;
  image?: string;
  data?: Record<string, unknown>;
}

interface MixpostMedia {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  url: string;
}

interface MixpostPost {
  id: string;
  content: string;
  accounts: string[];
  media?: string[];
  scheduled_at?: string;
  status: string;
}

interface CreatePostParams {
  content: string;
  accounts: string[];
  media?: string[];
  scheduled_at?: string;
}

interface PostAnalytics {
  impressions: number;
  engagement: number;
  clicks: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}

export class MixpostClient {
  private baseUrl: string;
  private apiToken: string;

  constructor(apiToken?: string, baseUrl?: string) {
    // Use provided values or environment variables
    // Default to production server if not set
    this.baseUrl = baseUrl || process.env.MIXPOST_URL || 'http://188.245.34.21:8082';
    this.apiToken = apiToken || process.env.MIXPOST_API_TOKEN || '';
    
    if (!this.apiToken) {
      console.warn('[MixpostClient] No API token provided. Set MIXPOST_API_TOKEN in .env.local');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mixpost API Error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Get all connected social media accounts
   */
  async getAccounts(): Promise<MixpostAccount[]> {
    const response = await this.request<{ data: MixpostAccount[] }>('/accounts');
    return response.data;
  }

  /**
   * Get a specific account by ID
   */
  async getAccount(accountId: string): Promise<MixpostAccount> {
    const response = await this.request<{ data: MixpostAccount }>(`/accounts/${accountId}`);
    return response.data;
  }

  /**
   * Upload a media file to Mixpost
   */
  async uploadMedia(file: File | Buffer, filename: string): Promise<MixpostMedia> {
    const formData = new FormData();
    
    if (file instanceof Buffer) {
      const blob = new Blob([file]);
      formData.append('file', blob, filename);
    } else {
      formData.append('file', file);
    }

    const url = `${this.baseUrl}/api/v1/media/upload`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Media upload failed (${response.status}): ${error}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Upload media from URL
   */
  async uploadMediaFromUrl(url: string, filename: string): Promise<MixpostMedia> {
    // Download the file first
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file from URL: ${url}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return this.uploadMedia(buffer, filename);
  }

  /**
   * Create a new post
   */
  async createPost(params: CreatePostParams): Promise<MixpostPost> {
    const response = await this.request<{ data: MixpostPost }>('/posts', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return response.data;
  }

  /**
   * Schedule a post for later
   */
  async schedulePost(params: CreatePostParams & { scheduled_at: string }): Promise<MixpostPost> {
    return this.createPost(params);
  }

  /**
   * Get a specific post
   */
  async getPost(postId: string): Promise<MixpostPost> {
    const response = await this.request<{ data: MixpostPost }>(`/posts/${postId}`);
    return response.data;
  }

  /**
   * Get all posts
   */
  async getPosts(): Promise<MixpostPost[]> {
    const response = await this.request<{ data: MixpostPost[] }>('/posts');
    return response.data;
  }

  /**
   * Update a post
   */
  async updatePost(postId: string, params: Partial<CreatePostParams>): Promise<MixpostPost> {
    const response = await this.request<{ data: MixpostPost }>(`/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
    return response.data;
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<void> {
    await this.request(`/posts/${postId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get analytics for a post (if available)
   * Note: This might not be available in all Mixpost versions
   */
  async getPostAnalytics(postId: string): Promise<PostAnalytics | null> {
    try {
      const response = await this.request<{ data: PostAnalytics }>(`/posts/${postId}/analytics`);
      return response.data;
    } catch (error) {
      console.warn('Analytics not available for this post:', error);
      return null;
    }
  }

  /**
   * Get account analytics
   */
  async getAccountAnalytics(accountId: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.request<{ data: Record<string, unknown> }>(`/accounts/${accountId}/analytics`);
      return response.data;
    } catch (error) {
      console.warn('Analytics not available for this account:', error);
      return {};
    }
  }
}

/**
 * Create a Mixpost client instance
 */
export function createMixpostClient(apiToken?: string, baseUrl?: string): MixpostClient {
  return new MixpostClient(apiToken, baseUrl);
}

/**
 * Default Mixpost client using environment variables
 */
export const mixpostClient = createMixpostClient();

