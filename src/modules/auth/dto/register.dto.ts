import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Email нового пользователя',
    example: 'newuser@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Пароль (минимум 6 символов)',
    example: 'strongPassword123',
    minLength: 6,
    format: 'password',
  })
  @IsString()
  @MinLength(6)
  password: string;
}
