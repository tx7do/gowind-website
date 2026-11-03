# Frontend Application Development in Practice

GoWind CMS provides four frontend applications (Vue/React/Taro/Flutter). This tutorial uses React (Next.js) as the main thread and walks you through the complete frontend application development process: from project initialization, API integration, and page development, to internationalization and deployment.

## Prerequisites

- You have read [CMS Frontend Architecture](./frontend-architecture.md) and [Headless API Multi-Client Integration in Practice](./tutorial-headless-api.md)
- Familiar with basic TypeScript / React concepts
- The CMS backend services are running locally (Admin: 6600, App: 6700)

## 1. Technology Selection

### 1.1 Comparison of the Four Frontends

| Version | Framework | Rendering | Target Platform | SEO | Use Case |
|------|------|---------|---------|-----|---------|
| **React** | Next.js 15 | SSR / SSG | PC Web | Excellent | Corporate websites, news portals |
| **Vue** | Nuxt.js 3 | SSR / SSG | PC Web | Excellent | Blogs, content sites |
| **Taro** | Taro 4 | CSR | Mini programs + H5 | Poor | WeChat mini programs, mobile H5 |
| **Flutter** | Flutter 3 | Native rendering | Android/iOS/Web | Poor | Cross-platform native apps |

### 1.2 Selection Guide

```mermaid
graph TD
    Start[需求分析] --> Q1{目标平台?}
    Q1 -->|PC Web| Q2{团队技术偏好?}
    Q1 -->|微信小程序| Taro[Taro 版]
    Q1 -->|移动 App| Flutter[Flutter 版]

    Q2 -->|React 生态| React[React / Next.js]
    Q2 -->|Vue 生态| Vue[Vue / Nuxt.js]

    React --> Q3{需要 SEO?}
    Vue --> Q3
    Q3 -->|是| SSR[使用 SSR 渲染]
    Q3 -->|否| SSG[使用 SSG 静态生成]
```

This tutorial uses **React (Next.js)** as the example, because it is the most common solution for enterprise-grade content sites.

## 2. Project Initialization

### 2.1 Creating the Next.js Project

```shell
# Create the project
npx create-next-app@latest cms-frontend-react \
  --typescript \
  --app \
  --tailwind \
  --eslint

cd cms-frontend-react
```

### 2.2 Installing Dependencies

```shell
# HTTP client
pnpm add axios

# Internationalization
pnpm add next-intl

# UI components
pnpm add @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react

# State management (client state)
pnpm add zustand

# Markdown rendering (as needed)
pnpm add react-markdown remark-gfm rehype-raw

# Dev dependencies
pnpm add -D @types/node
```

### 2.3 Directory Structure

```
cms-frontend-react/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── [locale]/               # i18n routes
│   │   │   ├── layout.tsx          # Root layout (navbar, footer)
│   │   │   ├── page.tsx            # Home page
│   │   │   ├── posts/
│   │   │   │   ├── page.tsx        # Post list
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx    # Post detail
│   │   │   ├── categories/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx    # Posts by category
│   │   │   ├── tags/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx    # Posts by tag
│   │   │   ├── about/
│   │   │   │   └── page.tsx        # About page
│   │   │   ├── login/
│   │   │   │   └── page.tsx        # Login page
│   │   │   └── profile/
│   │   │       └── page.tsx        # Profile center
│   │   └── api/                    # Next.js API routes (optional proxy)
│   ├── components/                 # React components
│   │   ├── layout/                 # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── post/                   # Post components
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostList.tsx
│   │   │   └── CommentSection.tsx
│   │   └── ui/                     # Base UI components
│   ├── lib/                        # Utility libraries
│   │   ├── api/                    # API clients
│   │   │   ├── client.ts           # Axios instance
│   │   │   ├── post.ts             # Post API
│   │   │   ├── category.ts         # Category API
│   │   │   └── auth.ts             # Auth API
│   │   ├── i18n/                   # i18n configuration
│   │   └── utils.ts                # Common utilities
│   ├── messages/                   # i18n messages
│   │   ├── zh-CN.json
│   │   └── en-US.json
│   ├── stores/                     # Zustand state management
│   │   ├── auth.ts                 # Auth state
│   │   └── settings.ts             # Site settings
│   └── middleware.ts               # Next.js middleware
├── public/                         # Static assets
├── .env.local                      # Environment variables
├── next.config.ts                  # Next.js configuration
├── tailwind.config.ts              # Tailwind configuration
└── package.json
```

### 2.4 Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:6700/app/v1
NEXT_PUBLIC_DEFAULT_LOCALE=zh-CN
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 3. Building the API Layer

### 3.1 Axios Client

```typescript
// src/lib/api/client.ts
import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:6700/app/v1';

// Server and client use different token storage approaches
export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  // Client requests automatically inject the token
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
```

### 3.2 API Function Wrappers

```typescript
// src/lib/api/post.ts
import { apiClient } from './client';

export interface PostListParams {
  locale?: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDesc?: boolean;
  search?: string;
  categoryId?: number;
  tagId?: number;
}

export async function getPosts(params: PostListParams = {}) {
  return apiClient.get('/posts', { params });
}

export async function getPostBySlug(slug: string, locale: string) {
  return apiClient.get(`/posts/${slug}`, { params: { locale } });
}

export async function getPostsByCategory(categorySlug: string, locale: string, page = 1) {
  return apiClient.get('/posts', {
    params: { locale, page, categorySlug },
  });
}

// src/lib/api/category.ts
export async function getCategories(locale?: string) {
  return apiClient.get('/categories', { params: { locale } });
}

// src/lib/api/navigation.ts
export async function getNavigations() {
  return apiClient.get('/navigations');
}

// src/lib/api/auth.ts
export async function login(username: string, password: string) {
  return apiClient.post('/login', { username, password });
}
```

## 4. Page Development

### 4.1 Root Layout (Navbar and Footer)

```tsx
// src/app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { getNavigations, getSiteSettings } from '@/lib/api';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const [messages, navigations, siteSettings] = await Promise.all([
    getMessages(),
    getNavigations(),
    getSiteSettings(locale),
  ]);

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="flex min-h-screen flex-col">
        <Header
          navigations={navigations.items}
          siteName={siteSettings.name}
          logo={siteSettings.logo}
        />
        <main className="flex-1">{children}</main>
        <Footer siteSettings={siteSettings} />
      </div>
    </NextIntlClientProvider>
  );
}
```

### 4.2 Home Page (Post List)

```tsx
// src/app/[locale]/page.tsx
import { getPosts, getCategories } from '@/lib/api';
import PostCard from '@/components/post/PostCard';
import Pagination from '@/components/ui/Pagination';

export default async function HomePage({
  params: { locale },
  searchParams: { page = '1' },
}: {
  params: { locale: string };
  searchParams: { page?: string };
}) {
  const pageNum = Number(page);
  const [postsData, categoriesData] = await Promise.all([
    getPosts({ locale, page: pageNum, pageSize: 9 }),
    getCategories(locale),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero section */}
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">最新内容</h1>
        <p className="text-gray-600">探索精彩文章与资讯</p>
      </section>

      {/* Post grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {postsData.items.map((post) => (
          <PostCard key={post.id} post={post} locale={locale} />
        ))}
      </div>

      {/* Pagination */}
      <Pagination
        current={pageNum}
        total={postsData.total}
        pageSize={9}
      />
    </div>
  );
}
```

### 4.3 Post Card Component

```tsx
// src/components/post/PostCard.tsx
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';

interface PostCardProps {
  post: {
    id: number;
    title: string;
    slug: string;
    summary: string;
    thumbnail?: string;
    createdAt: string;
    categories?: { name: string; slug: string }[];
  };
  locale: string;
}

export default function PostCard({ post, locale }: PostCardProps) {
  return (
    <Link href={`/${locale}/posts/${post.slug}`}>
      <article className="rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
        {post.thumbnail && (
          <Image
            src={post.thumbnail}
            alt={post.title}
            width={400}
            height={200}
            className="w-full h-48 object-cover"
          />
        )}
        <div className="p-5">
          {post.categories && (
            <div className="flex gap-2 mb-2">
              {post.categories.map((cat) => (
                <span key={cat.slug} className="text-xs text-blue-600">
                  {cat.name}
                </span>
              ))}
            </div>
          )}
          <h2 className="text-xl font-semibold mb-2 line-clamp-2">
            {post.title}
          </h2>
          <p className="text-gray-600 text-sm line-clamp-3">{post.summary}</p>
          <time className="text-xs text-gray-400 mt-3 block">
            {format(new Date(post.createdAt), 'yyyy-MM-dd')}
          </time>
        </div>
      </article>
    </Link>
  );
}
```

### 4.4 Post Detail Page (with Comments)

```tsx
// src/app/[locale]/posts/[slug]/page.tsx
import { getPostBySlug } from '@/lib/api';
import CommentSection from '@/components/post/CommentSection';
import { notFound } from 'next/navigation';

export async function generateMetadata({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  const post = await getPostBySlug(slug, locale);
  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      images: post.thumbnail ? [post.thumbnail] : [],
    },
  };
}

export default async function PostDetailPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  let post;
  try {
    post = await getPostBySlug(slug, locale);
  } catch {
    notFound();
  }

  return (
    <article className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Post header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>作者：{post.author?.name}</span>
          <time>{new Date(post.createdAt).toLocaleDateString(locale)}</time>
        </div>
      </header>

      {/* Post body */}
      <div
        className="prose prose-lg max-w-none mb-12"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Tags */}
      {post.tags && (
        <div className="flex gap-2 mb-12">
          {post.tags.map((tag) => (
            <Link
              key={tag.slug}
              href={`/${locale}/tags/${tag.slug}`}
              className="px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      )}

      {/* Comment section */}
      <CommentSection postId={post.id} />
    </article>
  );
}
```

### 4.5 Category and Tag Filter Pages

```tsx
// src/app/[locale]/categories/[slug]/page.tsx
import { getCategories, getPosts } from '@/lib/api';
import PostCard from '@/components/post/PostCard';

export default async function CategoryPage({
  params: { locale, slug },
  searchParams: { page = '1' },
}: {
  params: { locale: string; slug: string };
  searchParams: { page?: string };
}) {
  const categories = await getCategories(locale);
  const category = categories.items.find((c) => c.slug === slug);

  if (!category) notFound();

  const posts = await getPosts({
    locale,
    categoryId: category.id,
    page: Number(page),
    pageSize: 9,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">分类：{category.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.items.map((post) => (
          <PostCard key={post.id} post={post} locale={locale} />
        ))}
      </div>
    </div>
  );
}
```

## 5. Authentication Features

### 5.1 Login Page

```tsx
// src/app/[locale]/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { login } from '@/lib/api/auth';

export default function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const t = useTranslations('auth');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login(username, password);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      router.push(`/${locale}/profile`);
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md py-20">
      <h1 className="text-2xl font-bold mb-6 text-center">{t('login')}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder={t('username')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder={t('password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border rounded"
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? t('loggingIn') : t('login')}
        </button>
      </form>
    </div>
  );
}
```

### 5.2 Authentication State Management

```typescript
// src/stores/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  avatar?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) =>
        set({ token, user, isAuthenticated: true }),
      logout: () =>
        set({ token: null, user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' },
  ),
);
```

## 6. Internationalization Configuration

### 6.1 next-intl Configuration

```typescript
// src/i18n.ts
import { getRequestConfig } from 'next-intl/server';

export const locales = ['zh-CN', 'en-US'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}));
```

### 6.2 Message Files

```json
// src/messages/zh-CN.json
{
  "auth": {
    "login": "登录",
    "logout": "退出",
    "username": "用户名",
    "password": "密码",
    "loggingIn": "登录中..."
  },
  "post": {
    "latest": "最新文章",
    "readMore": "阅读更多",
    "comments": "评论",
    "leaveComment": "发表评论"
  },
  "common": {
    "loading": "加载中...",
    "noData": "暂无数据",
    "search": "搜索"
  }
}
```

### 6.3 Middleware

```typescript
// src/middleware.ts
import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n';

export default createMiddleware({
  locales,
  defaultLocale: 'zh-CN',
  localePrefix: 'always',
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

## 7. SEO Optimization

### 7.1 Metadata Generation

```tsx
// src/app/[locale]/posts/[slug]/page.tsx
export async function generateMetadata({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  const post = await getPostBySlug(slug, locale);

  return {
    title: post.title,
    description: post.summary,
    keywords: post.tags?.map((t) => t.name),
    alternates: {
      canonical: `/${locale}/posts/${slug}`,
      languages: {
        'zh-CN': `/zh-CN/posts/${slug}`,
        'en-US': `/en-US/posts/${slug}`,
      },
    },
    openGraph: {
      title: post.title,
      description: post.summary,
      type: 'article',
      publishedTime: post.createdAt,
      images: post.thumbnail ? [{ url: post.thumbnail }] : [],
    },
  };
}
```

### 7.2 Structured Data

```tsx
function JsonLd({ post }: { post: any }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.summary,
    image: post.thumbnail,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: post.author?.name,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

### 7.3 Sitemap and robots

```tsx
// src/app/sitemap.ts
import { getPosts } from '@/lib/api';

export default async function sitemap() {
  const posts = await getPosts({ pageSize: 1000 });
  const locales = ['zh-CN', 'en-US'];

  const postUrls = posts.items.flatMap((post) =>
    locales.map((locale) => ({
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/posts/${post.slug}`,
      lastModified: new Date(post.updatedAt || post.createdAt),
    })),
  );

  return [
    { url: process.env.NEXT_PUBLIC_SITE_URL!, lastModified: new Date() },
    ...postUrls,
  ];
}

// src/app/robots.ts
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/profile/'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
```

## 8. Build and Deployment

### 8.1 Building

```shell
# Production build
pnpm build

# Local preview
pnpm start
```

### 8.2 Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
services:
  cms-react:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_BASE_URL=https://api.cms.gowind.cloud/app/v1
      - NEXT_PUBLIC_DEFAULT_LOCALE=zh-CN
    restart: always
```

### 8.3 Environment Variables

| Environment | API Address |
|------|---------|
| Development | `http://localhost:6700/app/v1` |
| Testing | `https://api.test.cms.gowind.cloud/app/v1` |
| Production | `https://api.cms.gowind.cloud/app/v1` |

## 9. Performance Optimization Tips

### 9.1 Image Optimization

```tsx
import Image from 'next/image';

// Next.js automatically optimizes images (WebP, lazy loading, responsive)
<Image
  src={post.thumbnail}
  alt={post.title}
  width={400}
  height={200}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

### 9.2 ISR (Incremental Static Regeneration)

```tsx
// src/app/[locale]/posts/[slug]/page.tsx
export const revalidate = 60; // Regenerate the page every 60 seconds

export default async function PostDetailPage({ params }) {
  // The page is statically generated and revalidated in the background after 60 seconds
}
```

### 9.3 Data Prefetching

```tsx
// Prefetch category and tag data
export async function generateStaticParams() {
  const posts = await getPosts({ pageSize: 100 });
  return posts.items.map((post) => ({
    locale: 'zh-CN',
    slug: post.slug,
  }));
}
```

## 10. Checklist

| Check Item | Description |
|--------|------|
| Project initialization | Next.js + TypeScript + Tailwind |
| API layer | Axios client + API function wrappers |
| Page development | Home + post list + detail + categories/tags |
| Authentication | Login page + token management + state management |
| Internationalization | next-intl configuration + message files |
| SEO optimization | Metadata + sitemap + structured data |
| Build and deploy | Docker image + environment variables |
| Performance optimization | Image optimization + ISR + prefetching |

## Related Documents

- [CMS Frontend Architecture](./frontend-architecture.md)
- [Headless API Multi-Client Integration in Practice](./tutorial-headless-api.md)
- [Content Multilingual Translation in Practice](./tutorial-content-i18n.md)
- [Multi-Site Management in Practice](./tutorial-multi-site.md)
