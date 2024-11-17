import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsBoolean, IsIn } from 'class-validator';

// Define the safe user type without password
export type SafeUser = Omit<User, 'password' | 'toJSON'> & {
  password?: never;
};

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @Column()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @Column()
  @IsNotEmpty()
  firstName!: string;

  @Column()
  @IsNotEmpty()
  lastName!: string;

  @Column({ nullable: true })
  @IsOptional()
  phoneNumber?: string;

  @Column()
  @IsNotEmpty()
  country!: string;

  @Column({ default: 'user' })
  @IsOptional()
  @IsIn(['user', 'admin'])
  role: string = 'user';

  @Column({ type: 'text', nullable: true, default: null })
  refreshToken?: string | null;

  @Column({ default: false })
  @IsOptional()
  @IsBoolean()
  eventManager: boolean = false;

  @Column({ default: false })
  @IsOptional()
  @IsBoolean()
  performer: boolean = false;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  profilePicture?: string;

  @Column({ unique: true })
  @IsNotEmpty()
  username!: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  bio?: string;

  @Column({ type: 'simple-json', nullable: true })
  @IsOptional()
  socialMediaLinks?: string[];

  toJSON(): SafeUser {
    // Create a new object with all properties except password
    const { password, ...safeUser } = { ...this };
    return safeUser;
  }
}