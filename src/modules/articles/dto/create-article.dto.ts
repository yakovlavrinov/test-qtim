import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateArticleDto {
  @ApiProperty({
    description: 'Заголовок статьи',
    example: 'Моя первая статья',
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({
    description: 'Описание или содержание статьи',
    example: 'Это подробное описание статьи, минимум 10 символов...',
    minLength: 10,
  })
  @IsString()
  @MinLength(10)
  description: string;
}
