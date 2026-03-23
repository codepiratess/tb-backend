import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 500, nullable: true })
  subtitle: string;

  @Column({ length: 1000, nullable: true })
  description: string;

  @Column({ name: 'button_text', length: 100, default: 'Shop Now' })
  buttonText: string;

  @Column({ name: 'button_link', length: 500, nullable: true })
  buttonLink: string;

  @Column({ nullable: true })
  image: string;

  @Column({ name: 'bg_color', length: 200, default: 'from-[#2874F0] to-[#1a5dc8]' })
  bgColor: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
