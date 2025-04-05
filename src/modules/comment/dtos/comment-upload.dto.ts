import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class CommentUploadCompleteDto {
  @IsString()
  @IsNotEmpty()
  objectName: string; // Tên file duy nhất trên MinIO

  @IsIn(['image', 'video']) // Chỉ chấp nhận loại này cho comment
  @IsNotEmpty()
  fileType: 'image' | 'video';
}