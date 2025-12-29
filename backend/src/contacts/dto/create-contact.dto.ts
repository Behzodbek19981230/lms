import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateContactDto {
  @IsNotEmpty({ message: 'Ism familiya majburiy' })
  @IsString({ message: "Ism familiya matn bo'lishi kerak" })
  @Length(2, 255, {
    message: "Ism familiya 2-255 belgidan iborat bo'lishi kerak",
  })
  name: string;

  @IsNotEmpty({ message: 'Telefon raqam majburiy' })
  @IsString({ message: "Telefon raqam matn bo'lishi kerak" })
  @Length(7, 20, {
    message: "Telefon raqam 7-20 belgidan iborat bo'lishi kerak",
  })
  phone: string;

  @IsNotEmpty({ message: 'Xabar majburiy' })
  @IsString({ message: "Xabar matn bo'lishi kerak" })
  @Length(10, 1000, { message: "Xabar 10-1000 belgidan iborat bo'lishi kerak" })
  message: string;
}
