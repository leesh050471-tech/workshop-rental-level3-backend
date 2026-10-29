import {
  Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, Req,
  ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource, ILike, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Public, Roles } from './auth';
import { Equipment, Inquiry, User } from './entities';
import { CreateEquipmentDto, CreateInquiryDto, CreateReservationDto, LoginDto, UpdateEquipmentDto } from './dto';
import { ReservationsService } from './reservations.service';
import { AiService } from './ai.service';
import { SeedService } from './seed.service';

@Controller()
export class AppController {
  constructor(
    private ds: DataSource,
    private jwt: JwtService,
    private reservations: ReservationsService,
    private ai: AiService,
    private seed: SeedService,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Equipment) private equipment: Repository<Equipment>,
    @InjectRepository(Inquiry) private inquiries: Repository<Inquiry>,
  ) {}

  // ---------- 상태 확인 ----------
  @Public()
  @Get('health')
  async health() {
    try {
      await this.ds.query('SELECT 1');
      return { status: 'ok', database: 'connected', time: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'disconnected' });
    }
  }

  // ---------- 로그인 ----------
  @Public()
  @Post('auth/login')
  async login(@Body() dto: LoginDto) {
    const u = await this.users.findOne({ where: { email: dto.email.trim().toLowerCase() } });
    if (!u || !(await bcrypt.compare(dto.password, u.password_hash))) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 맞지 않아요.');
    }
    const token = this.jwt.sign({ sub: u.id, name: u.name, role: u.role });
    return { token, user: { id: u.id, name: u.name, email: u.email, role: u.role } };
  }

  @Get('auth/me')
  async me(@Req() req: any) {
    const u = await this.users.findOne({ where: { id: req.user.id } });
    if (!u) throw new UnauthorizedException('다시 로그인해 주세요.');
    return { id: u.id, name: u.name, email: u.email, role: u.role };
  }

  // ---------- 장비 ----------
  @Get('equipment')
  list(@Query('q') q?: string, @Query('category') category?: string, @Query('status') status?: string) {
    const where: any = {};
    if (q?.trim()) where.name = ILike(`%${q.trim().replace(/[%_]/g, '')}%`);
    if (category) where.category = category;
    if (status) where.status = status;
    return this.equipment.find({ where, order: { id: 'ASC' } });
  }

  @Get('equipment/:id')
  async one(@Param('id', ParseIntPipe) id: number) {
    const e = await this.equipment.findOne({ where: { id } });
    if (!e) throw new NotFoundException('없는 장비예요.');
    return { ...e, booked: await this.reservations.booked(id) };
  }

  @Roles('admin')
  @Post('equipment')
  createEquipment(@Body() dto: CreateEquipmentDto) {
    return this.equipment.save(this.equipment.create({ ...dto, description: dto.description || '' }));
  }

  @Roles('admin')
  @Patch('equipment/:id')
  async updateEquipment(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEquipmentDto) {
    const e = await this.equipment.findOne({ where: { id } });
    if (!e) throw new NotFoundException('없는 장비예요.');
    Object.assign(e, dto);
    return this.equipment.save(e);
  }

  // ---------- 예약 ----------
  @Roles('member')
  @Post('reservations')
  createReservation(@Req() req: any, @Body() dto: CreateReservationDto) {
    return this.reservations.create(req.user, dto);
  }

  @Delete('reservations/:id')
  cancelReservation(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.reservations.cancel(req.user, id);
  }

  @Get('reservations/mine')
  mine(@Req() req: any) {
    return this.reservations.mine(req.user);
  }

  @Roles('admin')
  @Get('reservations')
  allReservations() {
    return this.reservations.all();
  }

  // ---------- 현황 ----------
  @Roles('admin')
  @Get('stats')
  stats() {
    return this.reservations.stats();
  }

  // ---------- 문의 + AI ----------
  @Roles('member')
  @Post('inquiries')
  async createInquiry(@Req() req: any, @Body() dto: CreateInquiryDto) {
    if (dto.equipment_id && !(await this.equipment.findOne({ where: { id: dto.equipment_id } }))) {
      throw new NotFoundException('없는 장비예요.');
    }
    return this.inquiries.save(
      this.inquiries.create({ user_id: req.user.id, equipment_id: dto.equipment_id ?? null, content: dto.content }),
    );
  }

  @Roles('member')
  @Get('inquiries/mine')
  myInquiries(@Req() req: any) {
    return this.inquiries.find({ where: { user_id: req.user.id }, relations: { equipment: true }, order: { id: 'DESC' } });
  }

  @Roles('admin')
  @Get('inquiries')
  allInquiries() {
    return this.inquiries.find({ relations: { equipment: true, user: true }, order: { id: 'DESC' } });
  }

  @Roles('admin')
  @Post('inquiries/:id/ai')
  async analyzeInquiry(@Param('id', ParseIntPipe) id: number) {
    const q = await this.inquiries.findOne({ where: { id }, relations: { equipment: true } });
    if (!q) throw new NotFoundException('없는 문의예요.');
    const r = await this.ai.analyze(q.content, q.equipment?.name);
    q.ai_summary = r.summary;
    q.ai_category = r.category;
    q.ai_reply_draft = r.reply;
    return this.inquiries.save(q);
  }

  // ---------- 가상 데이터 다시 채우기 ----------
  @Roles('admin')
  @Post('admin/reseed')
  async reseed() {
    await this.seed.reseed();
    return { message: '가상 데이터를 다시 채웠어요. 모든 계정은 그대로 쓸 수 있어요.' };
  }
}
