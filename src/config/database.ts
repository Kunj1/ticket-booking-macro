import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../models/User';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';
import { Booking } from '../models/Booking';

export const dbConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Event, Ticket, Booking],
  synchronize: process.env.NODE_ENV === 'development',
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
  migrations: [__dirname + '/../migrations/*.ts'],
  migrationsRun: true,
  logging: process.env.NODE_ENV === 'development',
  ssl: { rejectUnauthorized: false }
};

export const AppDataSource = new DataSource(dbConfig);