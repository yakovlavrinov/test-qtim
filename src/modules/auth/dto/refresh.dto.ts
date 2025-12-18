import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    description: 'Refresh-токен, полученный при логине',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx',
  })
  @IsJWT()
  @IsNotEmpty()
  refreshToken: string;
}
