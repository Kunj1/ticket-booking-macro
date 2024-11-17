import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Event } from './Event';

@Entity()
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Event, event => event.tickets)
  event!: Event;

  @Column()
  type!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price!: number;

  @Column()
  quantity!: number;

  @Column({ default: 0 })
  soldCount!: number;

  @Column({ nullable: true })
  saleStartDate?: Date;

  @Column({ nullable: true })
  saleEndDate?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}