import { Request, Response } from 'express';
import Customer from '../models/Customer';
import { logger } from '../utils/logger';

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (error: any) {
    logger.error('Error fetching customers', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, address } = req.body;
    const customer = new Customer({ name, phone, address });
    await customer.save();
    res.status(201).json(customer);
  } catch (error: any) {
    logger.error('Error creating customer', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, address } = req.body;
    const customer = await Customer.findByIdAndUpdate(id, { name, phone, address }, { new: true });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json(customer);
  } catch (error: any) {
    logger.error('Error updating customer', { customerId: req.params.id, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};
