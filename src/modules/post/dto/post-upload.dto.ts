import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class PostUploadCompleteDto {
  @IsString()
  @IsNotEmpty()
  objectName: string;

  @IsIn(['image', 'video'])
  @IsNotEmpty()
  fileType: 'image' | 'video';
}