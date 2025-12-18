import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between } from 'typeorm';
import { Article } from './article.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class ArticlesService {
  private readonly LIST_VERSION_KEY = 'articles:list:version';
  private readonly LIST_TTL = 60_000;
  private readonly ONE_TTL = 60_000;

  constructor(
    @InjectRepository(Article)
    private readonly articlesRepository: Repository<Article>,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async create(data: Partial<Article>) {
    const article = this.articlesRepository.create(data);
    const saved = await this.articlesRepository.save(article);

    await this.invalidateListCache();

    return saved;
  }

  async findAll(params: {
    page: number;
    limit: number;
    authorId?: string;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const version = await this.getListVersion();
    const cacheKey = this.getListCacheKey(version, params);

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const { page, limit, authorId, fromDate, toDate } = params;

    const where: FindOptionsWhere<Article> = {};

    if (authorId) {
      where.authorId = authorId;
    }

    if (fromDate && toDate) {
      where.publishedAt = Between(fromDate, toDate);
    }

    const [items, total] = await this.articlesRepository.findAndCount({
      where,
      take: limit,
      skip: (page - 1) * limit,
      order: { publishedAt: 'DESC' },
    });

    const result = { items, total, page, limit };

    await this.cacheManager.set(cacheKey, result, this.LIST_TTL);

    return result;
  }

  async findOne(id: string) {
    const cacheKey = `articles:one:${id}`;

    const cached = await this.cacheManager.get<Article>(cacheKey);
    if (cached) {
      return cached;
    }

    const article = await this.articlesRepository.findOne({ where: { id } });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    await this.cacheManager.set(cacheKey, article, this.ONE_TTL);

    return article;
  }

  async update(id: string, data: Partial<Article>) {
    const article = await this.findOne(id);
    Object.assign(article, data);
    const saved = await this.articlesRepository.save(article);

    await this.cacheManager.del(`articles:one:${id}`);
    await this.invalidateListCache();

    return saved;
  }

  async remove(id: string) {
    const article = await this.findOne(id);
    await this.articlesRepository.remove(article);

    await this.cacheManager.del(`articles:one:${id}`);
    await this.invalidateListCache();

    return { deleted: true };
  }

  private async invalidateListCache() {
    const version = await this.getListVersion();
    await this.cacheManager.set(this.LIST_VERSION_KEY, version + 1);
  }

  private async getListVersion(): Promise<number> {
    const version = await this.cacheManager.get<number>(this.LIST_VERSION_KEY);
    return version ?? 1;
  }

  private getListCacheKey(
    version: number,
    params: {
      page: number;
      limit: number;
      authorId?: string;
      fromDate?: Date;
      toDate?: Date;
    },
  ) {
    const parts = [
      `v:${version}`,
      `page:${params.page}`,
      `limit:${params.limit}`,
    ];

    if (params.authorId) {
      parts.push(`author:${params.authorId}`);
    }

    if (params.fromDate && params.toDate) {
      const from = params.fromDate.toISOString().split('T')[0];
      const to = params.toDate.toISOString().split('T')[0];
      parts.push(`date:${from}-${to}`);
    }

    return `articles:list:${parts.join('|')}`;
  }
}
