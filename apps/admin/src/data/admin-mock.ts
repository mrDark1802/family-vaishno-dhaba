export interface AdminOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY_FOR_PICKUP"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED";
  orderType: "DELIVERY" | "TAKEAWAY";
  createdAt: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    notes?: string;
  }[];
}

export const ADMIN_STATS = {
  todayRevenue: 28450,
  todayOrders: 42,
  activeKitchenOrders: 6,
  completedOrders: 36,
  averageOrderValue: 677,
};

export const ADMIN_ORDERS: AdminOrder[] = [
  {
    id: "ord-101",
    orderNumber: "FVD-8942",
    customerName: "Aarav Sharma",
    customerPhone: "+91 98160 54321",
    deliveryAddress: "House 42, Civil Lines, Near Stadium Road, Kangra",
    status: "PREPARING",
    orderType: "DELIVERY",
    createdAt: "10 mins ago (01:15 PM)",
    totalAmount: 1008,
    paymentMethod: "UPI",
    paymentStatus: "PAID",
    items: [
      {
        name: "Himachali Siddu with Pure Desi Ghee",
        quantity: 2,
        price: 180,
        notes: "Extra ghee packet",
      },
      { name: "Slow-Cooked Dhaba Dal Makhani", quantity: 1, price: 260 },
      {
        name: "Amritsari Aloo Pyaaz Chur Chur Kulcha",
        quantity: 2,
        price: 130,
      },
      { name: "Dhaba Special Sweet Malai Lassi", quantity: 2, price: 90 },
    ],
  },
  {
    id: "ord-102",
    orderNumber: "FVD-8941",
    customerName: "Priya Mahajan",
    customerPhone: "+91 94180 98765",
    deliveryAddress: "Flat 302, Pine View Apartments, Dharamshala Road",
    status: "PENDING",
    orderType: "DELIVERY",
    createdAt: "3 mins ago (01:22 PM)",
    totalAmount: 760,
    paymentMethod: "COD",
    paymentStatus: "PENDING",
    items: [{ name: "Traditional Kangri Dham Thali", quantity: 2, price: 380 }],
  },
  {
    id: "ord-103",
    orderNumber: "FVD-8940",
    customerName: "Rohan Verma",
    customerPhone: "+91 98050 11223",
    deliveryAddress: "Takeaway Counter",
    status: "READY_FOR_PICKUP",
    orderType: "TAKEAWAY",
    createdAt: "22 mins ago (01:03 PM)",
    totalAmount: 510,
    paymentMethod: "UPI",
    paymentStatus: "PAID",
    items: [
      { name: "Paneer Butter Masala (Desi Ghee)", quantity: 1, price: 310 },
      { name: "Pahadi Rajma Chawal Platter", quantity: 1, price: 200 },
    ],
  },
  {
    id: "ord-104",
    orderNumber: "FVD-8939",
    customerName: "Vikram Singh",
    customerPhone: "+91 98170 33445",
    deliveryAddress: "NH 154 Petrol Pump, Kangra",
    status: "OUT_FOR_DELIVERY",
    orderType: "DELIVERY",
    createdAt: "35 mins ago (12:50 PM)",
    totalAmount: 640,
    paymentMethod: "UPI",
    paymentStatus: "PAID",
    items: [
      { name: "Clay Oven Tandoori Paneer Tikka", quantity: 1, price: 280 },
      { name: "Sarson Da Saag with Makki Di Roti", quantity: 1, price: 290 },
      { name: "Tandoori Butter Naan", quantity: 1, price: 60 },
    ],
  },
  {
    id: "ord-105",
    orderNumber: "FVD-8938",
    customerName: "Sunita Katoch",
    customerPhone: "+91 94182 66778",
    deliveryAddress: "Temple Road, Old Kangra",
    status: "DELIVERED",
    orderType: "DELIVERY",
    createdAt: "55 mins ago (12:30 PM)",
    totalAmount: 1140,
    paymentMethod: "UPI",
    paymentStatus: "PAID",
    items: [
      { name: "Sepu Vadi Madra (Kangri Specialty)", quantity: 2, price: 240 },
      { name: "Himachali Siddu with Pure Desi Ghee", quantity: 2, price: 180 },
      { name: "Himachali Mittha Bhat", quantity: 2, price: 150 },
    ],
  },
];

export const ADMIN_CUSTOMERS = [
  {
    id: "cust-1",
    name: "Aarav Sharma",
    phone: "+91 98160 54321",
    email: "aarav.sharma@example.com",
    ordersCount: 14,
    totalSpent: 12450,
    lastOrderDate: "Today",
    location: "Civil Lines, Kangra",
  },
  {
    id: "cust-2",
    name: "Priya Mahajan",
    phone: "+91 94180 98765",
    email: "priya.m@example.com",
    ordersCount: 8,
    totalSpent: 6200,
    lastOrderDate: "Today",
    location: "Dharamshala Road, Kangra",
  },
  {
    id: "cust-3",
    name: "Vikram Singh",
    phone: "+91 98170 33445",
    email: "vikram.singh@example.com",
    ordersCount: 22,
    totalSpent: 19800,
    lastOrderDate: "Today",
    location: "Bypass, Kangra",
  },
  {
    id: "cust-4",
    name: "Sunita Katoch",
    phone: "+91 94182 66778",
    email: "sunita.katoch@example.com",
    ordersCount: 5,
    totalSpent: 4300,
    lastOrderDate: "Yesterday",
    location: "Old Kangra",
  },
];

export const ADMIN_REVIEWS = [
  {
    id: "rev-1",
    customerName: "Aarav Sharma",
    rating: 5,
    dish: "Himachali Siddu with Ghee",
    comment:
      "The Siddu is as authentic as it gets in Mandi Dham. Fresh, steaming hot and generous pure ghee.",
    date: "Today, 02:00 PM",
    status: "PUBLISHED",
  },
  {
    id: "rev-2",
    customerName: "Meenakshi Devi",
    rating: 5,
    dish: "Dhaba Dal Makhani & Kulcha",
    comment:
      "Best Dal Makhani on the highway! No synthetic cream, authentic slow coal cooked taste.",
    date: "Yesterday",
    status: "PUBLISHED",
  },
  {
    id: "rev-3",
    customerName: "Karan Mehra",
    rating: 4,
    dish: "Sepu Vadi Madra",
    comment:
      "Very tasty curd gravy. Would love slightly more whole spice flavor.",
    date: "28 Aug 2026",
    status: "PUBLISHED",
  },
];
