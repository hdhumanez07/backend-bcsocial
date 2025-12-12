import { Column, PrimaryGeneratedColumn, Entity } from 'typeorm';

@Entity()
export class SumProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', default: 0 })
  sumProduct: number;
}
