import { IsNotEmpty, IsString, IsIn, Matches } from 'class-validator';

export class CommentUploadCompleteDto {
  @IsString()
  @IsNotEmpty()
  objectName: string; // Tên file duy nhất trên MinIO

  @IsIn(['image', 'video']) // Chỉ chấp nhận loại này cho comment
  @IsNotEmpty()
  fileType: 'image' | 'video';
}

export class CommentUploadPresignDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(image\/(jpeg|png|gif|webp)|video\/(mp4|quicktime|webm))$/i, { // Example validation for allowed types
    message: 'Invalid file type. Allowed image (jpg, png, gif, webp) or video (mp4, mov, webm) types.'
  })
  contentType: string;
}