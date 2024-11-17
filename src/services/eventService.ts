import { AppDataSource } from '../config/database';
import { Event } from '../models/Event';
import { AppError } from '../utils/AppError';
import { Between, Like } from 'typeorm';

const eventRepository = AppDataSource.getRepository(Event);

export const eventService = {
  async createEvent(eventData: Partial<Event>): Promise<Event> {
    const event = eventRepository.create(eventData);
    await eventRepository.save(event);
    return event;
  },

  async getEvents({ search, category, startDate, endDate, page = 1, limit = 10 }: {
    search?: string,
    category?: string,
    startDate?: Date,
    endDate?: Date,
    page?: number,
    limit?: number
  }): Promise<{ events: Event[], total: number }> {
    const query: any = {};

    if (search) {
      query.title = Like(`%${search}%`);
    }

    if (category) {
      query.category = category;
    }

    if (startDate && endDate) {
      query.date = Between(startDate, endDate);
    }

    const [events, total] = await eventRepository.findAndCount({
      where: query,
      skip: (page - 1) * limit,
      take: limit,
      order: { date: 'ASC' }
    });

    return { events, total };
  },

  async getEventById(id: string): Promise<Event> {
    const event = await eventRepository.findOne({ where: { id } });
    if (!event) {
      throw new AppError('Event not found', 404);
    }
    return event;
  },

  async updateEvent(id: string, eventData: Partial<Event>): Promise<Event> {
    const event = await eventRepository.findOne({ where: { id } });
    if (!event) {
      throw new AppError('Event not found', 404);
    }
    eventRepository.merge(event, eventData);
    return eventRepository.save(event);
  },

  async deleteEvent(id: string): Promise<void> {
    const result = await eventRepository.delete(id);
    if (result.affected === 0) {
      throw new AppError('Event not found', 404);
    }
  },

  async getUpcomingEvents(limit: number = 10): Promise<Event[]> {
    return eventRepository.find({
      where: { date: Between(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) },
      order: { date: 'ASC' },
      take: limit
    });
  }
};