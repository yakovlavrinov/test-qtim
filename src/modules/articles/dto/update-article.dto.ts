import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateArticleDto {
  @ApiPropertyOptional({
    description: 'Новый заголовок статьи (опционально)',
    example: 'Обновлённый заголовок',
    minLength: 3,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({
    description: 'Новое описание или содержание статьи (опционально)',
    example: 'Обновлённое подробное описание...',
    minLength: 10,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;
}
