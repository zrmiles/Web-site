// Re-export the shared wire DTOs so client code keeps importing from "../types".
export type {
  User,
  Product,
  Order,
  OrderItem,
  CartItem,
  ToastType,
} from '../../shared/types';

import type { ToastType } from '../../shared/types';

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}
