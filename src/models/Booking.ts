import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';
import { Ticket } from './Ticket';

@Entity()
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;  

  @ManyToOne(() => User, { eager: true })
  user!: User;  

  @ManyToOne(() => Ticket, { eager: true })
  ticket!: Ticket;  

  @Column()
  quantity!: number;  

  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice!: number;  

  @Column({ default: 'pending' })
  status: string = 'pending';

  @CreateDateColumn()
  createdAt!: Date;  

  @UpdateDateColumn()
  updatedAt!: Date;  
}