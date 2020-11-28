import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Invalid customer!');
    }

    const storagedProducts = await this.productsRepository.findAllById(
      products,
    );

    if (storagedProducts.length === 0) {
      throw new AppError('Invalid products!');
    }

    const productsWithPrice = storagedProducts.map(product => {
      const orderItem = products.find(p => p.id === product.id);

      if (!orderItem) {
        throw new AppError('Product not found!');
      }

      if (product.quantity < orderItem.quantity) {
        throw new AppError('Insuficient amount!');
      }

      return {
        product_id: product.id,
        price: product.price,
        quantity: orderItem.quantity,
      };
    });

    const order = await this.ordersRepository.create({
      products: productsWithPrice,
      customer,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
