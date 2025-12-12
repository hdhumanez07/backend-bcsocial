import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SumProduct } from './entities/sum.entity';
import { Product } from './entities/product.entity';
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(SumProduct)
    private readonly sumProductRepository: Repository<SumProduct>,
  ) {}
  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      const product = this.productRepository.create(createProductDto);
      return await this.productRepository.save(product);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        'Error creating product',
        errorMessage,
      );
    }
  }
  async findAll(): Promise<Product[]> {
    try {
      return await this.productRepository.find({
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        'Error fetching products',
        errorMessage,
      );
    }
  }
  async findOne(id: string): Promise<Product> {
    if (!this.isValidUUID(id)) {
      throw new BadRequestException('The provided ID is not a valid UUID');
    }
    try {
      const product = await this.productRepository.findOne({
        where: { id },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }
      const sumProduct = await this.sumProductRepository.increment(
        { id: '18b90291-eb46-42a3-a304-646bbb360aed' },
        'sumProduct',
        1,
      );
      return {
        ...product,
        ...sumProduct,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        'Error fetching product',
        errorMessage,
      );
    }
  }
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    if (!this.isValidUUID(id)) {
      throw new BadRequestException('The provided ID is not a valid UUID');
    }
    const product = await this.findOne(id);
    try {
      Object.assign(product, updateProductDto);
      return await this.productRepository.save(product);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        'Error updating product',
        errorMessage,
      );
    }
  }
  async remove(id: string): Promise<void> {
    if (!this.isValidUUID(id)) {
      throw new BadRequestException('The provided ID is not a valid UUID');
    }
    const product = await this.findOne(id);
    try {
      await this.productRepository.softRemove(product);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        'Error deleting product',
        errorMessage,
      );
    }
  }
  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
