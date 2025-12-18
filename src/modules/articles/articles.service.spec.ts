import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ArticlesService } from './articles.service';
import { Article } from './article.entity';
import { NotFoundException } from '@nestjs/common';
import { User } from '../users/user.entity';

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockArticleRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findAndCount: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
};

describe('ArticlesService', () => {
  let service: ArticlesService;

  const mockArticle: Article = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Article',
    description: 'This is a test',
    publishedAt: new Date('2025-01-01'),
    author: { id: 'user-1', email: 'john@example.com' } as User,
    authorId: 'user-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: getRepositoryToken(Article),
          useValue: mockArticleRepository,
        },
        {
          provide: 'CACHE_MANAGER',
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create article and invalidate list cache', async () => {
      mockArticleRepository.create.mockReturnValue(mockArticle);
      mockArticleRepository.save.mockResolvedValue(mockArticle);
      mockCacheManager.get.mockResolvedValue(1);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.create({
        title: 'Test Article',
        description: 'This is a test',
        authorId: 'user-1',
      });

      expect(result).toEqual(mockArticle);
      expect(mockArticleRepository.save).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'articles:list:version',
        2,
      );
    });
  });

  describe('findAll', () => {
    it('should return cached data if exists', async () => {
      const cachedResult = {
        items: [mockArticle],
        total: 1,
        page: 1,
        limit: 10,
      };
      mockCacheManager.get.mockResolvedValueOnce(5);
      mockCacheManager.get.mockResolvedValueOnce(cachedResult);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual(cachedResult);
      expect(mockArticleRepository.findAndCount).not.toHaveBeenCalled();
    });

    it('should fetch from DB, cache result and return it when no cache', async () => {
      mockCacheManager.get.mockResolvedValueOnce(1);
      mockCacheManager.get.mockResolvedValueOnce(null);
      mockArticleRepository.findAndCount.mockResolvedValue([[mockArticle], 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        items: [mockArticle],
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(mockArticleRepository.findAndCount).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('articles:list:v:1|page:1|limit:10'),
        expect.any(Object),
        60000,
      );
    });
  });

  describe('findOne', () => {
    it('should return cached article if exists', async () => {
      mockCacheManager.get.mockResolvedValue(mockArticle);

      const result = await service.findOne(mockArticle.id);

      expect(result).toEqual(mockArticle);
      expect(mockArticleRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache when no cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockArticleRepository.findOne.mockResolvedValue(mockArticle);

      const result = await service.findOne(mockArticle.id);

      expect(result).toEqual(mockArticle);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        `articles:one:${mockArticle.id}`,
        mockArticle,
        60000,
      );
    });

    it('should throw NotFoundException if article not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockArticleRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update article and clear both individual and list cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockArticleRepository.findOne.mockResolvedValue(mockArticle);
      mockArticleRepository.save.mockResolvedValue({
        ...mockArticle,
        title: 'Updated Title',
      });
      mockCacheManager.get.mockResolvedValue(3);

      const result = await service.update(mockArticle.id, {
        title: 'Updated Title',
      });

      expect(result.title).toBe('Updated Title');
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `articles:one:${mockArticle.id}`,
      );
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'articles:list:version',
        4,
      );
    });
  });

  describe('remove', () => {
    it('should remove article and clear caches', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockArticleRepository.findOne.mockResolvedValue(mockArticle);

      const result = await service.remove(mockArticle.id);

      expect(result).toEqual({ deleted: true });
      expect(mockArticleRepository.remove).toHaveBeenCalledWith(mockArticle);
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `articles:one:${mockArticle.id}`,
      );
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'articles:list:version',
        expect.any(Number),
      );
    });
  });
});
