import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EQUIP_CATEGORIES, EQUIP_STATUSES } from './entities';

export class LoginDto {
  @IsString({ message: '이메일을 입력해 주세요.' })
  @Length(3, 100, { message: '이메일을 입력해 주세요.' })
  email: string;

  @IsString({ message: '비밀번호를 입력해 주세요.' })
  @Length(1, 100, { message: '비밀번호를 입력해 주세요.' })
  password: string;
}

export class CreateEquipmentDto {
  @IsString({ message: '장비 이름을 입력해 주세요.' })
  @Length(2, 40, { message: '장비 이름은 2자 이상 40자 이하로 써 주세요.' })
  name: string;

  @IsIn(EQUIP_CATEGORIES, { message: '장비 종류를 골라 주세요.' })
  category: string;

  @IsOptional()
  @IsString()
  @Length(0, 300, { message: '설명은 300자 이하로 써 주세요.' })
  description?: string;
}

export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  @Length(2, 40, { message: '장비 이름은 2자 이상 40자 이하로 써 주세요.' })
  name?: string;

  @IsOptional()
  @IsIn(EQUIP_CATEGORIES, { message: '장비 종류를 골라 주세요.' })
  category?: string;

  @IsOptional()
  @IsString()
  @Length(0, 300, { message: '설명은 300자 이하로 써 주세요.' })
  description?: string;

  @IsOptional()
  @IsIn(EQUIP_STATUSES, { message: '상태는 사용가능 또는 고장 중에서 골라 주세요.' })
  status?: string;
}

export class CreateReservationDto {
  @Type(() => Number)
  @IsInt({ message: '장비를 선택해 주세요.' })
  equipment_id: number;

  @IsString({ message: '날짜를 입력해 주세요.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '날짜는 2026-10-30 모양으로 써 주세요.' })
  date: string;

  @Type(() => Number)
  @IsInt({ message: '시작 시간을 골라 주세요.' })
  @Min(0, { message: '시작 시간을 골라 주세요.' })
  @Max(23, { message: '시작 시간을 골라 주세요.' })
  start_hour: number;

  @Type(() => Number)
  @IsInt({ message: '이용 시간을 골라 주세요.' })
  @Min(1, { message: '이용 시간은 1시간 이상이어야 해요.' })
  @Max(4, { message: '이용 시간은 최대 4시간까지예요.' })
  hours: number;
}

export class CreateInquiryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '장비를 다시 골라 주세요.' })
  equipment_id?: number;

  @IsString({ message: '문의 내용을 입력해 주세요.' })
  @Length(5, 1000, { message: '문의 내용은 5자 이상 1000자 이하로 써 주세요.' })
  content: string;
}
