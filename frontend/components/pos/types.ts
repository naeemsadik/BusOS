export interface OrderDetails {
  customerName: string
  customerPhone: string
  customerEmail?: string;
  recipientName?: string; // For courier services
  recipientPhone?: string; // For courier services  
  recipientEmail?: string; // For courier services
  deliveryType: "pickup" | "delivery" | "steadfast" | "paperfly" | ""
  courierService?: "steadfast" | "paperfly" | "pathao" | ""
  // Pathao specific fields
  pathaoStoreId?: number | string
  pathaoRecipientCity?: number | string
  pathaoRecipientZone?: number | string
  pathaoItemType?: 1 | 2
  pathaoItemWeight?: number
  pathaoPriceLoading?: boolean
  deliveryAddress: string
  deliveryCity?: string
  deliveryState?: string
  deliveryZipCode?: string
  paymentMethod: "cash" | "card" | "mobile" | "delivery_partner" | "cod" | ""
  mobileProvider: "bkash" | "nagad" | "rocket" | "upay" | ""
  cardType: "visa" | "mastercard" | "amex" | "other" | ""
  transactionId: string
  notes: string
  waiveDeliveryFee?: boolean
  deliveryFee: number
  discountType: "percentage" | "flat" | ""
  discountValue: number
  paidAmount: number
  amountDue?: number; // For tracking remaining amount
  codAmount?: number
  alternativePhone?: string
  itemDescription?: string
  totalLot?: number
  steadfastDeliveryType?: 0 | 1
  paperflyOrderNumber?: string
  pathaoRecipientArea?: string | undefined;
}
