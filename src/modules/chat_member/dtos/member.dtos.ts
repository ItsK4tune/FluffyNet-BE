import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class AddMemberDto {
  @IsNumber()
  @IsNotEmpty()
  user_id: number;

  @IsString()
  @IsOptional()
  type?: string = 'active';

  @IsString()
  @IsOptional()
  role?: string = 'member';
}

export class MemberUpdateDto {
  @IsString()
  @IsOptional()
  @IsIn(['admin', 'member'])
  role?: string;

  @IsString()
  @IsOptional()
  nickname?: string;
}
