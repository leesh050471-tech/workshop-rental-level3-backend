import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Equipment, Reservation } from './entities';
import { CreateReservationDto } from './dto';
import { AuthUser } from './auth';

export const MAX_ACTIVE = 2;
const OPEN_HOUR = 9;
const CLOSE_HOUR = 21;

const kstToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const kstTime = (date: string, hour: number) => new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+09:00`);

function reject(message: string, field?: string): never {
  throw new BadRequestException({ message, fields: field ? { [field]: message } : undefined });
}

@Injectable()
export class ReservationsService {
  constructor(
    private ds: DataSource,
    @InjectRepository(Reservation) private repo: Repository<Reservation>,
  ) {}

  async create(user: AuthUser, dto: CreateReservationDto) {
    const parsed = new Date(dto.date + 'T00:00:00Z');
    if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dto.date) {
      reject('존재하지 않는 날짜예요. 다시 확인해 주세요.', 'date');
    }
    const days = Math.round((kstTime(dto.date, 0).getTime() - kstTime(kstToday(), 0).getTime()) / 86400e3);
    if (days < 0) reject('지난 날짜는 예약할 수 없어요.', 'date');
    if (days > 7) reject('예약은 오늘부터 7일 안에서만 할 수 있어요.', 'date');
    if (dto.start_hour < OPEN_HOUR || dto.start_hour + dto.hours > CLOSE_HOUR) {
      reject(`이용 시간은 ${OPEN_HOUR}시부터 ${CLOSE_HOUR}시 사이여야 해요. 끝나는 시각이 ${CLOSE_HOUR}시를 넘을 수 없어요.`, 'start_hour');
    }
    const start = kstTime(dto.date, dto.start_hour);
    const end = kstTime(dto.date, dto.start_hour + dto.hours);
    if (start.getTime() <= Date.now()) reject('이미 지난 시간은 예약할 수 없어요.', 'start_hour');

    return this.ds.transaction(async (m) => {
      // 같은 장비에 대한 동시 예약을 순서대로 처리하기 위해 장비 행을 잠근다
      const eq = await m.findOne(Equipment, { where: { id: dto.equipment_id }, lock: { mode: 'pessimistic_write' } });
      if (!eq) throw new NotFoundException('없는 장비예요.');
      if (eq.status === '고장') {
        throw new ConflictException('이 장비는 지금 고장 상태라 예약할 수 없어요.');
      }
      const overlap = await m
        .createQueryBuilder(Reservation, 'r')
        .where('r.equipment_id = :e AND r.status = :s AND r.start_at < :end AND r.end_at > :start', {
          e: eq.id, s: '예약됨', start, end,
        })
        .getCount();
      if (overlap > 0) throw new ConflictException('그 시간에는 이미 다른 분이 예약했어요. 다른 시간을 골라 주세요.');

      const active = await m
        .createQueryBuilder(Reservation, 'r')
        .where('r.user_id = :u AND r.status = :s AND r.end_at > :now', { u: user.id, s: '예약됨', now: new Date() })
        .getCount();
      if (active >= MAX_ACTIVE) {
        throw new ConflictException(`한 사람이 동시에 가질 수 있는 예약은 ${MAX_ACTIVE}건까지예요. 기존 예약을 취소하거나 이용을 마친 뒤 신청해 주세요.`);
      }
      return m.save(Reservation, m.create(Reservation, { equipment_id: eq.id, user_id: user.id, start_at: start, end_at: end }));
    });
  }

  async cancel(user: AuthUser, id: number) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('없는 예약이에요.');
    if (user.role !== 'admin' && r.user_id !== user.id) throw new ForbiddenException('내 예약만 취소할 수 있어요.');
    if (r.status === '취소됨') throw new ConflictException('이미 취소된 예약이에요.');
    if (r.end_at.getTime() <= Date.now()) throw new ConflictException('이미 끝난 예약은 취소할 수 없어요.');
    r.status = '취소됨';
    return this.repo.save(r);
  }

  mine(user: AuthUser) {
    return this.repo.find({ where: { user_id: user.id }, relations: { equipment: true }, order: { start_at: 'DESC' } });
  }

  all() {
    return this.repo.find({ relations: { equipment: true, user: true }, order: { start_at: 'DESC' } });
  }

  /** 장비 상세 화면에서 이미 찬 시간을 보여 주기 위한 목록(누가 예약했는지는 숨김) */
  async booked(equipmentId: number) {
    const rows = await this.repo
      .createQueryBuilder('r')
      .select(['r.id', 'r.start_at', 'r.end_at'])
      .where('r.equipment_id = :e AND r.status = :s AND r.end_at > :now', { e: equipmentId, s: '예약됨', now: new Date() })
      .orderBy('r.start_at', 'ASC')
      .getMany();
    return rows.map((r) => ({ id: r.id, start_at: r.start_at, end_at: r.end_at }));
  }

  async stats() {
    const today = kstToday();
    const from = kstTime(today, 0);
    const to = new Date(from.getTime() + 86400e3);
    const todayReservations = await this.repo
      .createQueryBuilder('r')
      .where('r.status = :s AND r.start_at >= :from AND r.start_at < :to', { s: '예약됨', from, to })
      .getCount();
    const [{ available, broken }] = await this.ds.query(
      `SELECT COUNT(*) FILTER (WHERE status = '사용가능')::int AS available,
              COUNT(*) FILTER (WHERE status = '고장')::int AS broken
         FROM "${process.env.DB_SCHEMA || 'level3'}".equipment`,
    );
    return { todayReservations, availableEquipment: available, brokenEquipment: broken };
  }
}
