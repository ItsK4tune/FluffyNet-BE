import { IsNotEmpty, IsString, IsIn } from 'class-validator';
import { Matches } from 'class-validator';

export class PostUploadCompleteDto {
  @IsString()
  @IsNotEmpty()
  objectName: string;

  @IsIn(['image', 'video'])
  @IsNotEmpty()
  fileType: 'image' | 'video';
}

export class PostUploadPresignDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[\w-]+\/[\w-.+]+$/, { message: 'Invalid MIME type format' })
  contentType: string;
}