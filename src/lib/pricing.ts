import { ItemPrices } from './types';

export const DEFAULT_PRICES: ItemPrices = {
  priceTent: 0,
  priceCar: 0,
  priceBird: 0,
  priceRabbit: 0,
};

export interface RentedItemCounts {
  rentedTents: number;
  rentedCars: number;
  rentedBirds: number;
  rentedRabbits: number;
}

// The reservation total is always derived from the Admin-managed unit prices,
// never typed in by the host.
export function calculateTotal(counts: RentedItemCounts, prices: ItemPrices): number {
  const total =
    (Number(counts.rentedTents) || 0) * (Number(prices.priceTent) || 0) +
    (Number(counts.rentedCars) || 0) * (Number(prices.priceCar) || 0) +
    (Number(counts.rentedBirds) || 0) * (Number(prices.priceBird) || 0) +
    (Number(counts.rentedRabbits) || 0) * (Number(prices.priceRabbit) || 0);

  return Math.round(total * 100) / 100;
}
