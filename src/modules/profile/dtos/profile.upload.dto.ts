import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class ProfileUploadPresignDto {
    @IsString()
    @IsNotEmpty()
    filename: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^image\/(jpeg|png|gif|webp)$/, { 
        message: 'Invalid image MIME type. Allowed types: image/jpeg, image/png, image/gif, image/webp'
    })
    contentType: string;

    @IsIn(['avatar', 'background'])
    @IsNotEmpty()
    imageType: 'avatar' | 'background';
}

export class ProfileUpdateMediaDto {
    @IsString()
    @IsOptional() 
    objectName: string | null;
}