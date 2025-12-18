import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between } from 'typeorm';
import { Article } from './article.entity';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articlesRepository: Repository<Article>,
  ) {}

  create(data: Partial<Article>) {
    const article = this.articlesRepository.create(data);
    return this.articlesRepository.save(article);
  }

  async findAll(params: {
    page: number;
    limit: number;
    authorId?: string;
    fromDate?: Date;
    toDate?: Date;
  }) {
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

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const article = await this.articlesRepository.findOne({ where: { id } });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return article;
  }

  async update(id: string, data: Partial<Article>) {
    const article = await this.findOne(id);
    Object.assign(article, data);
    return this.articlesRepository.save(article);
  }

  async remove(id: string) {
    const article = await this.findOne(id);
    return this.articlesRepository.remove(article);
  }
}
