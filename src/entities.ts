import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export const EQUIP_CATEGORIES = ['3D프린터', '레이저', '재봉', '목공', '기타'];
export const EQUIP_STATUSES = ['사용가능', '고장'];

@Entity('users')
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) email: string;
  @Column() password_hash: string;
  @Column() name: string;
  @Column({ default: 'member' }) role: string; // admin | member
}

@Entity('equipment')
export class Equipment {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column() category: string;
  @Column({ type: 'text', default: '' }) description: string;
  @Column({ default: '사용가능' }) status: string;
  @CreateDateColumn() created_at: Date;
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn() id: number;
  @Column() equipment_id: number;
  @ManyToOne(() => Equipment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;
  @Column() user_id: number;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
  @Column({ type: 'timestamptz' }) start_at: Date;
  @Column({ type: 'timestamptz' }) end_at: Date;
  @Column({ default: '예약됨' }) status: string; // 예약됨 | 취소됨
  @CreateDateColumn() created_at: Date;
}

@Entity('inquiries')
export class Inquiry {
  @PrimaryGeneratedColumn() id: number;
  @Column() user_id: number;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
  @Column({ type: 'int', nullable: true }) equipment_id: number | null;
  @ManyToOne(() => Equipment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment | null;
  @Column({ type: 'text' }) content: string;
  @Column({ type: 'text', nullable: true }) ai_summary: string | null;
  @Column({ type: 'text', nullable: true }) ai_category: string | null;
  @Column({ type: 'text', nullable: true }) ai_reply_draft: string | null;
  @CreateDateColumn() created_at: Date;
}
