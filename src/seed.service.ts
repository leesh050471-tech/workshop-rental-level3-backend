import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Equipment, Inquiry, Reservation, User } from './entities';

const kstDate = (offsetDays: number) => new Date(Date.now() + 9 * 3600e3 + offsetDays * 86400e3).toISOString().slice(0, 10);
const at = (offsetDays: number, hour: number) => new Date(`${kstDate(offsetDays)}T${String(hour).padStart(2, '0')}:00:00+09:00`);

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(private ds: DataSource) {}

  async onApplicationBootstrap() {
    if ((await this.ds.getRepository(User).count()) === 0) await this.seed();
  }

  /** 모든 데이터를 지우고 가상 데이터를 다시 채운다 */
  async reseed() {
    const s = process.env.DB_SCHEMA || 'level3';
    await this.ds.query(
      `TRUNCATE "${s}".inquiries, "${s}".reservations, "${s}".equipment, "${s}".users RESTART IDENTITY CASCADE`,
    );
    await this.seed();
  }

  private async seed() {
    const adminHash = await bcrypt.hash('admin1234', 8);
    const memberHash = await bcrypt.hash('member1234', 8);
    const users = await this.ds.getRepository(User).save([
      { email: 'admin@moa.test', password_hash: adminHash, name: '윤하늘 매니저', role: 'admin' },
      { email: 'member1@moa.test', password_hash: memberHash, name: '김도현', role: 'member' },
      { email: 'member2@moa.test', password_hash: memberHash, name: '이서윤', role: 'member' },
      { email: 'member3@moa.test', password_hash: memberHash, name: '박지호', role: 'member' },
    ]);
    const eqRows = [
      ['3D 프린터 A', '3D프린터', '출력 크기 220x220x250mm, PLA 필라멘트 제공', '사용가능'],
      ['3D 프린터 B', '3D프린터', '대형 출력용 300x300x400mm', '사용가능'],
      ['3D 프린터 C', '3D프린터', '레진 방식, 작은 피규어 출력용', '고장'],
      ['레이저 커터 1호', '레이저', '아크릴·합판 절단, 작업 면적 600x400mm', '사용가능'],
      ['레이저 커터 2호', '레이저', '각인 전용 소형 기기', '사용가능'],
      ['공업용 재봉틀', '재봉', '두꺼운 원단용', '사용가능'],
      ['가정용 재봉틀', '재봉', '자수 기능 포함', '사용가능'],
      ['오버로크 재봉틀', '재봉', '원단 끝 처리용', '고장'],
      ['CNC 라우터', '목공', '목재 조각·절단 (안전 교육 필수)', '사용가능'],
      ['스크롤 톱', '목공', '곡선 절단용 전동 톱', '사용가능'],
      ['열전사 프린터', '기타', '티셔츠·머그컵 전사 인쇄', '사용가능'],
      ['UV 프린터', '기타', '휴대폰 케이스 등 입체물 인쇄', '사용가능'],
    ];
    const eq = await this.ds.getRepository(Equipment).save(
      eqRows.map(([name, category, description, status]) => ({ name, category, description, status })),
    );
    const [, m1, m2, m3] = users;
    const res = (u: User, e: number, day: number, h: number, hours: number, status = '예약됨') => ({
      user_id: u.id, equipment_id: eq[e].id, start_at: at(day, h), end_at: at(day, h + hours), status,
    });
    await this.ds.getRepository(Reservation).save([
      res(m1, 0, 0, 20, 1),
      res(m2, 3, 0, 20, 1),
      res(m3, 5, 1, 10, 3),
      res(m1, 3, 1, 13, 2),
      res(m2, 8, 2, 14, 2),
      res(m3, 0, 2, 9, 4),
      res(m1, 10, 4, 11, 2),
      res(m2, 1, 3, 15, 2, '취소됨'),
      res(m3, 6, -1, 10, 2),
    ]);
    await this.ds.getRepository(Inquiry).save([
      { user_id: m1.id, equipment_id: eq[2].id, content: '3D 프린터 C를 쓰려고 했는데 전원은 들어오는데 출력 중간에 계속 멈춰요. 레진이 노즐에 굳은 것 같기도 하고요. 어제부터 그랬어요.' },
      { user_id: m2.id, equipment_id: eq[3].id, content: '레이저 커터 처음 쓰는데 아크릴 두께에 따라 출력 세기를 어떻게 정해야 하나요? 교육을 따로 받아야 하나요?' },
      { user_id: m3.id, equipment_id: null, content: '주말에도 작업실을 열어 주실 수 있나요? 평일에는 시간이 안 돼서 예약이 어려워요.' },
    ]);
  }
}
