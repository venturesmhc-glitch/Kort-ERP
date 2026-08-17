import { createMockCollection } from '../../lib/mockStore';
import type { Articulo, ArticuloInput } from './articulos.types';

const seed: Articulo[] = [
  {
    id: 'art-cera',
    nombre: 'Cera modeladora',
    tipoProductoId: 'prod-cosmetica',
    tipoProductoNombre: 'Cosmetica',
    precio: 4500,
    stock: 20,
  },
  {
    id: 'art-aceite-barba',
    nombre: 'Aceite para barba',
    tipoProductoId: 'prod-cosmetica',
    tipoProductoNombre: 'Cosmetica',
    precio: 5200,
    stock: 15,
  },
  {
    id: 'art-gorra',
    nombre: 'Gorra Kort',
    tipoProductoId: 'prod-indumentaria',
    tipoProductoNombre: 'Indumentaria',
    precio: 8900,
    stock: 10,
  },
  {
    id: 'art-remera',
    nombre: 'Remera Kort',
    tipoProductoId: 'prod-indumentaria',
    tipoProductoNombre: 'Indumentaria',
    precio: 12000,
    stock: 12,
  },
  {
    id: 'art-peine',
    nombre: 'Peine de bolsillo',
    tipoProductoId: 'prod-accesorios',
    tipoProductoNombre: 'Accesorios',
    precio: 2500,
    stock: 30,
  },
  {
    id: 'art-navaja',
    nombre: 'Navaja clasica',
    tipoProductoId: 'prod-accesorios',
    tipoProductoNombre: 'Accesorios',
    precio: 15000,
    stock: 5,
  },
];

const collection = createMockCollection<Articulo>('articulos', seed);

export const listArticulosRequest = () => collection.list();
export const createArticuloRequest = (input: ArticuloInput) => collection.create(input);
export const updateArticuloRequest = (id: string, input: ArticuloInput) => collection.update(id, input);
export const deleteArticuloRequest = (id: string) => collection.remove(id);

export async function adjustStockRequest(id: string, delta: number): Promise<Articulo> {
  const item = await collection.get(id);
  if (!item) {
    throw new Error('Articulo no encontrado');
  }
  const nextStock = item.stock + delta;
  if (nextStock < 0) {
    throw new Error('Stock insuficiente');
  }
  return collection.update(id, { stock: nextStock });
}
