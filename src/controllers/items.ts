import { RouteHandler } from 'fastify';
import { items } from '../dummy-data/items';

export const getItems: RouteHandler = (req, res) => {
  res.send(items);
};

export const getItem: RouteHandler = (req, res) => {
  const { id } = req.params as { id: number };
  const item = items.find((i) => i.id === id);
  if (item) {
    res.send(item);
  } else {
    res.status(404).send({ message: 'Item not found' });
  }
};
