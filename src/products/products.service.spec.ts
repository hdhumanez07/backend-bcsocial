import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
describe('ProductsService', () => {
  let service: ProductsService;
  let repository: Repository<Product>;
  const mockProduct = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    stock: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    softRemove: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
      ],
    }).compile();
    service = module.get<ProductsService>(ProductsService);
    repository = module.get<Repository<Product>>(getRepositoryToken(Product));
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('create', () => {
    it('should create a new product', async () => {
      const createDto = {
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        stock: 10,
      };
      mockRepository.create.mockReturnValue(mockProduct);
      mockRepository.save.mockResolvedValue(mockProduct);
      const result = await service.create(createDto);
      expect(result).toEqual(mockProduct);
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockProduct);
    });
    it('should throw InternalServerErrorException on database error', async () => {
      const createDto = {
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        stock: 10,
      };
      mockRepository.create.mockReturnValue(mockProduct);
      mockRepository.save.mockRejectedValue(new Error('Database error'));
      await expect(service.create(createDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
  describe('findAll', () => {
    it('should return an array of products', async () => {
      const products = [mockProduct];
      mockRepository.find.mockResolvedValue(products);
      const result = await service.findAll();
      expect(result).toEqual(products);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });
    it('should throw InternalServerErrorException on database error', async () => {
      mockRepository.find.mockRejectedValue(new Error('Database error'));
      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
  describe('findOne', () => {
    it('should return a product by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockProduct);
      const result = await service.findOne(mockProduct.id);
      expect(result).toEqual(mockProduct);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockProduct.id },
      });
    });
    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.findOne('invalid-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
    it('should throw NotFoundException when product not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(mockProduct.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
  describe('update', () => {
    it('should update a product', async () => {
      const updateDto = { price: 149.99 };
      const updatedProduct = { ...mockProduct, ...updateDto };
      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.save.mockResolvedValue(updatedProduct);
      const result = await service.update(mockProduct.id, updateDto);
      expect(result).toEqual(updatedProduct);
      expect(mockRepository.save).toHaveBeenCalled();
    });
    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.update('invalid-uuid', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });
  describe('remove', () => {
    it('should soft delete a product', async () => {
      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.softRemove.mockResolvedValue(mockProduct);
      await service.remove(mockProduct.id);
      expect(mockRepository.softRemove).toHaveBeenCalledWith(mockProduct);
    });
    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.remove('invalid-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
