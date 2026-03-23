import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './entities/banner.entity';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannersRepository: Repository<Banner>,
  ) {}

  async findAll(onlyActive = false) {
    const query = this.bannersRepository.createQueryBuilder('banner')
      .where('banner.deleted_at IS NULL');
    
    if (onlyActive) {
      query.andWhere('banner.is_active = :active', { active: true });
    }

    return query.orderBy('banner.sort_order', 'ASC').getMany();
  }

  async findOne(id: string) {
    const banner = await this.bannersRepository.findOneBy({ id });
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }

  async create(dto: CreateBannerDto) {
    const banner = this.bannersRepository.create(dto);
    return this.bannersRepository.save(banner);
  }

  async update(id: string, dto: UpdateBannerDto) {
    const banner = await this.findOne(id);
    Object.assign(banner, dto);
    return this.bannersRepository.save(banner);
  }

  async remove(id: string) {
    const result = await this.bannersRepository.softDelete(id);
    if (result.affected === 0) throw new NotFoundException('Banner not found');
  }
}
