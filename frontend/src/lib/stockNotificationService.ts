/**
 * Stock Notification Service
 * Manages low-stock detection, menu notification dots, and viewed/acknowledged states.
 * Persists acknowledgment state to localStorage so notifications do not reappear 
 * unnecessarily after page reloads or app restarts until a NEW low-stock item is detected.
 */

export interface StockItemSummary {
  id: string;
  item_name: string;
  current_quantity: number;
  minimum_threshold: number;
  unit: string;
  category?: string;
  location?: string;
}

export interface AcknowledgedStockEntry {
  quantity: number;
  acknowledgedAt: string;
}

export type AcknowledgedStockMap = Record<string, AcknowledgedStockEntry>;

const STOCK_STORAGE_KEY = 'booshnam_stock_inventory_v3';
const ACK_STORAGE_KEY = 'booshnam_acknowledged_low_stock_v2';

// Fallback initial items matching ProcurementView initial state
const DEFAULT_STOCK_ITEMS: StockItemSummary[] = [
  { id: 'stk-1', item_name: 'Cement 53 Grade (UltraTech)', current_quantity: 10, minimum_threshold: 5, unit: 'Bags' },
  { id: 'stk-2', item_name: 'TMT Steel 12mm (Tata Tiscon)', current_quantity: 4, minimum_threshold: 2, unit: 'Tons' },
  { id: 'stk-3', item_name: 'River Sand (Washed M-Sand)', current_quantity: 0, minimum_threshold: 3, unit: 'Loads' },
  { id: 'stk-4', item_name: 'Solid Red Clay Bricks', current_quantity: 2500, minimum_threshold: 1000, unit: 'Pcs' },
  { id: 'stk-5', item_name: '20mm Blue Metal Granite Aggregate', current_quantity: 18, minimum_threshold: 10, unit: 'Tons' }
];

/**
 * Retrieve all stock items from localStorage
 */
export const getStoredStockItems = (): StockItemSummary[] => {
  try {
    const raw = localStorage.getItem(STOCK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading stock items:', e);
  }
  return DEFAULT_STOCK_ITEMS;
};

/**
 * Retrieve acknowledged low-stock items from localStorage
 */
export const getAcknowledgedMap = (): AcknowledgedStockMap => {
  try {
    const raw = localStorage.getItem(ACK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading acknowledged stock map:', e);
  }
  return {};
};

/**
 * Save acknowledged low-stock items to localStorage
 */
export const saveAcknowledgedMap = (map: AcknowledgedStockMap): void => {
  try {
    localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Error saving acknowledged stock map:', e);
  }
};

/**
 * Get all items currently at or below minimum threshold
 */
export const getLowStockItems = (items?: StockItemSummary[]): StockItemSummary[] => {
  const stock = items || getStoredStockItems();
  return stock.filter(item => Number(item.current_quantity) <= Number(item.minimum_threshold));
};

/**
 * Get only NEW / UNACKNOWLEDGED low-stock items that should trigger the menu notification dot
 */
export const getUnacknowledgedLowStockItems = (items?: StockItemSummary[]): StockItemSummary[] => {
  const stock = items || getStoredStockItems();
  const ackMap = getAcknowledgedMap();
  let hasPruned = false;

  // Prune items that have been restocked above threshold so if they drop again, they alert again
  Object.keys(ackMap).forEach(id => {
    const matched = stock.find(s => s.id === id);
    if (matched && Number(matched.current_quantity) > Number(matched.minimum_threshold)) {
      delete ackMap[id];
      hasPruned = true;
    }
  });

  if (hasPruned) {
    saveAcknowledgedMap(ackMap);
  }

  // An item triggers an alert if it is low stock AND:
  // - It was never acknowledged, OR
  // - Its current stock has dropped lower than the previously acknowledged quantity
  return stock.filter(item => {
    const isLow = Number(item.current_quantity) <= Number(item.minimum_threshold);
    if (!isLow) return false;
    const ack = ackMap[item.id];
    if (!ack) return true;
    return Number(item.current_quantity) < Number(ack.quantity);
  });
};

/**
 * Check if the Procurement menu should display the notification dot
 */
export const hasLowStockNotification = (items?: StockItemSummary[]): boolean => {
  return getUnacknowledgedLowStockItems(items).length > 0;
};

/**
 * Mark all current low-stock items as viewed/acknowledged.
 * Persists to localStorage and dispatches event so the menu dot immediately disappears.
 */
export const markLowStockAsViewed = (items?: StockItemSummary[]): void => {
  const stock = items || getStoredStockItems();
  const ackMap = getAcknowledgedMap();

  stock.forEach(item => {
    if (Number(item.current_quantity) <= Number(item.minimum_threshold)) {
      ackMap[item.id] = {
        quantity: Number(item.current_quantity),
        acknowledgedAt: new Date().toISOString()
      };
    }
  });

  saveAcknowledgedMap(ackMap);
  window.dispatchEvent(new CustomEvent('booshnam_low_stock_updated'));
};

/**
 * Notify that stock has been updated (e.g., deducted, restocked, or added)
 */
export const notifyStockChanged = (): void => {
  window.dispatchEvent(new CustomEvent('booshnam_stock_updated'));
};
