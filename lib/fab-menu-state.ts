export function getNextFabMenuOpen(currentlyOpen: boolean, itemsCount: number): boolean {
  return itemsCount > 0 ? !currentlyOpen : false;
}

export function runFabItemAction(closeMenu: () => void, action: () => void): void {
  closeMenu();
  action();
}
