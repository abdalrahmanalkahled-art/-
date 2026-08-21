export interface WarehouseMovementReference {
  id: string;
  itemId: string;
}

export function removeWarehouseItemAndMovements<T extends { id: string }, M extends WarehouseMovementReference>(
  items: T[],
  movements: M[],
  itemId: string,
): { items: T[]; movements: M[] } {
  return {
    items: items.filter((item) => item.id !== itemId),
    movements: movements.filter((movement) => movement.itemId !== itemId),
  };
}
