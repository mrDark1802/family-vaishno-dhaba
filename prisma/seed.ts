import "dotenv/config";
import { PrismaClient, RegionalCuisine, UserRole } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const CATEGORIES_DATA = [
  {
    id: "cat-punjabi",
    name: "Punjabi Dhaba Specials",
    slug: "punjabi-specials",
    description:
      "Rich tandoori curries, paneer butter masala, dal makhani & desi ghee delicacies",
    icon: "🧈",
    imageUrl:
      "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=800&q=80",
    featured: true,
    displayOrder: 1,
  },
  {
    id: "cat-combos",
    name: "Thali & Special Combos",
    slug: "thali-combos",
    description:
      "Royal Punjabi Thali, Executive Meal Combos & Platters",
    icon: "🍱",
    imageUrl:
      "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80",
    featured: true,
    displayOrder: 2,
  },
  {
    id: "cat-breads",
    name: "Tandoori Breads & Kulchas",
    slug: "breads",
    description:
      "Clay oven rotis, naan, parathas and Amritsari stuffed kulchas",
    icon: "🫓",
    imageUrl:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
    featured: false,
    displayOrder: 3,
  },
  {
    id: "cat-rice",
    name: "Rice & Pulao",
    slug: "rice",
    description: "Basmati rice, jeera rice, khichdi and steaming hot pulao",
    icon: "🍚",
    imageUrl:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80",
    featured: false,
    displayOrder: 4,
  },
  {
    id: "cat-snacks",
    name: "Tandoori Starters & Snacks",
    slug: "snacks",
    description: "Crispy pakoras, paneer tikka, malai chaap and rolls",
    icon: "🍢",
    imageUrl:
      "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80",
    featured: false,
    displayOrder: 5,
  },
  {
    id: "cat-beverages",
    name: "Beverages & Punjabi Lassi",
    slug: "beverages",
    description:
      "Thick Punjabi sweet lassi, spiced chaas, and masala chai",
    icon: "🥤",
    imageUrl:
      "https://images.unsplash.com/photo-1571006687899-73b0a7c413b9?auto=format&fit=crop&w=800&q=80",
    featured: false,
    displayOrder: 6,
  },
  {
    id: "cat-desserts",
    name: "Traditional Desserts",
    slug: "desserts",
    description: "Hot gulab jamun with rabri, rasmalai and kheer",
    icon: "🍨",
    imageUrl:
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
    featured: false,
    displayOrder: 7,
  },
];

export interface SeedDish {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  cuisine: RegionalCuisine;
  price: number;
  hasHalfOption?: boolean;
  halfPrice?: number | null;
  description: string;
  longDescription: string | null;
  imageUrl: string;
  isChefSpecial: boolean;
  isAvailable: boolean;
  isSpicy: boolean;
  preparationTime: string;
  serves: string;
  displayOrder: number;
  customizationOptions?: any[] | null;
}

const DISHES_DATA: SeedDish[] = [
  // 1. Thali & Special Combos
  {
    id: "dish-royal-punjabi-thali",
    name: "Royal Punjabi Special Thali",
    slug: "royal-punjabi-special-thali",
    categorySlug: "thali-combos",
    cuisine: RegionalCuisine.PUNJABI,
    price: 340,
    hasHalfOption: false,
    halfPrice: null,
    description:
      "Paneer Butter Masala, Dal Makhani, Mix Veg, Jeera Rice, 2 Butter Naan, Raita, Salad & Hot Gulab Jamun.",
    longDescription:
      "The quintessential Punjabi Dhaba grand feast prepared with rich homemade butter and authentic Punjabi spice blends.",
    imageUrl:
      "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: true,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "20 mins",
    serves: "1-2 people",
    displayOrder: 1,
    customizationOptions: null,
  },
  {
    id: "dish-executive-thali",
    name: "Executive Dhaba Thali",
    slug: "executive-dhaba-thali",
    categorySlug: "thali-combos",
    cuisine: RegionalCuisine.PUNJABI,
    price: 260,
    hasHalfOption: false,
    halfPrice: null,
    description:
      "Dal Tadka, Shahi Paneer, Jeera Rice, 3 Tandoori Rotis, Papad, Pickled Onions & Sweet.",
    longDescription:
      "Wholesome and satisfying everyday thali combo for office lunch and family meals.",
    imageUrl:
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "15 mins",
    serves: "1 person",
    displayOrder: 2,
    customizationOptions: null,
  },
  {
    id: "dish-paneer-lababdar",
    name: "Paneer Lababdar (Dhaba Special)",
    slug: "paneer-lababdar-dhaba-special",
    categorySlug: "punjabi-specials",
    cuisine: RegionalCuisine.PUNJABI,
    price: 320,
    hasHalfOption: true,
    halfPrice: 180,
    description:
      "Cottage cheese grated and cubed in rich aromatic tomato, onion, cashew and melon seed gravy.",
    longDescription:
      "A rich, creamy Punjabi restaurant favorite with a dual texture of crumbled and cubed paneer in a luscious gravy.",
    imageUrl:
      "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: true,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "15-20 mins",
    serves: "2 people",
    displayOrder: 3,
    customizationOptions: null,
  },
  {
    id: "dish-chaap-masala",
    name: "Tandoori Chaap Masala Gravy",
    slug: "tandoori-chaap-masala-gravy",
    categorySlug: "punjabi-specials",
    cuisine: RegionalCuisine.PUNJABI,
    price: 280,
    hasHalfOption: true,
    halfPrice: 160,
    description:
      "Tender soya chaap roasted in clay oven and simmered in thick spicy onion-tomato gravy.",
    longDescription:
      "Marinated soya chaap skewered in tandoor then finished with charred capsicums and Punjabi garam masala.",
    imageUrl:
      "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: true,
    isAvailable: true,
    isSpicy: true,
    preparationTime: "15-20 mins",
    serves: "2 people",
    displayOrder: 4,
    customizationOptions: null,
  },
  {
    id: "dish-malai-kofta",
    name: "Shahi Malai Kofta in Rich Gravy",
    slug: "shahi-malai-kofta-rich-gravy",
    categorySlug: "punjabi-specials",
    cuisine: RegionalCuisine.PUNJABI,
    price: 310,
    hasHalfOption: true,
    halfPrice: 175,
    description:
      "Melt-in-mouth paneer and dry fruit koftas in a velvety cashew and fresh cream gravy.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "15 mins",
    serves: "2 people",
    displayOrder: 5,
    customizationOptions: null,
  },
  {
    id: "dish-paneer-bhurji",
    name: "Amritsari Paneer Bhurji",
    slug: "amritsari-paneer-bhurji",
    categorySlug: "punjabi-specials",
    cuisine: RegionalCuisine.PUNJABI,
    price: 290,
    hasHalfOption: true,
    halfPrice: 165,
    description:
      "Freshly scrambled malai paneer tossed with tomatoes, green chillies, ginger, and desi ghee.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: true,
    preparationTime: "12 mins",
    serves: "2 people",
    displayOrder: 6,
    customizationOptions: null,
  },
  {
    id: "dish-dal-fry",
    name: "Punjabi Dhaba Dal Fry (Desi Ghee)",
    slug: "punjabi-dhaba-dal-fry",
    categorySlug: "punjabi-specials",
    cuisine: RegionalCuisine.PUNJABI,
    price: 190,
    hasHalfOption: true,
    halfPrice: 110,
    description:
      "Yellow lentils cooked with aromatic spices, onions, garlic and finished with fresh coriander.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "12 mins",
    serves: "2 people",
    displayOrder: 7,
    customizationOptions: null,
  },

  // 2. Punjabi Dhaba Classics
  {
    id: "dish-dal-makhani",
    name: "Slow-Cooked Dhaba Dal Makhani",
    slug: "dhaba-dal-makhani",
    categorySlug: "punjabi-specials",
    cuisine: RegionalCuisine.PUNJABI,
    price: 260,
    hasHalfOption: true,
    halfPrice: 150,
    description:
      "Black urad lentils and kidney beans slow-simmered overnight on clay coals with white butter, cream, and ginger.",
    longDescription:
      "Cooked on a low charcoal flame for over 14 hours. The lentils break down into a naturally velvety texture enriched with fresh churned homemade makhan and whole sun-dried fenugreek leaves (kasoori methi).",
    imageUrl:
      "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: true,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "15 mins",
    serves: "2-3 people",
    displayOrder: 8,
    customizationOptions: null,
  },
  {
    id: "dish-paneer-butter-masala",
    name: "Paneer Butter Masala (Desi Ghee)",
    slug: "paneer-butter-masala",
    categorySlug: "punjabi-specials",
    cuisine: RegionalCuisine.PUNJABI,
    price: 310,
    hasHalfOption: true,
    halfPrice: 175,
    description:
      "Fresh malai paneer cubes simmered in a silky tomato, cashew, and rich buttery gravy.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "15-20 mins",
    serves: "2 people",
    displayOrder: 9,
    customizationOptions: [
      {
        name: "Spice Level",
        choices: [
          { name: "Mild & Creamy", price: 0 },
          { name: "Medium Spiced", price: 0 },
          { name: "Spicy Dhaba Style", price: 0 },
        ],
      },
    ],
  },
  {
    id: "dish-kadhai-paneer",
    name: "Kadhai Paneer with Bell Peppers & Coriander",
    slug: "kadhai-paneer-dhaba-style",
    categorySlug: "punjabi-specials",
    cuisine: RegionalCuisine.PUNJABI,
    price: 320,
    hasHalfOption: true,
    halfPrice: 180,
    description:
      "Succulent paneer cubes tossed with chunky capsicum, onions, and freshly pounded kadhai coriander & red chili spices.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: true,
    isAvailable: true,
    isSpicy: true,
    preparationTime: "15 mins",
    serves: "2 people",
    displayOrder: 10,
    customizationOptions: [
      {
        name: "Preparation Style",
        choices: [
          { name: "Thick Semi-Gravy", price: 0 },
          { name: "Dry Roasted Dhaba Style", price: 0 },
        ],
      },
    ],
  },
  {
    id: "dish-pindi-chole",
    name: "Amritsari Pindi Chole",
    slug: "amritsari-pindi-chole",
    categorySlug: "punjabi-specials",
    cuisine: RegionalCuisine.PUNJABI,
    price: 220,
    hasHalfOption: true,
    halfPrice: 125,
    description:
      "Dark, spicy and tangy chickpeas infused with roasted whole pomegranate seeds, ginger juliennes, and green chilies.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: true,
    preparationTime: "15 mins",
    serves: "2 people",
    displayOrder: 11,
    customizationOptions: null,
  },
  {
    id: "dish-sarson-saag",
    name: "Sarson Da Saag with Makki Di Roti",
    slug: "sarson-saag-makki-roti",
    categorySlug: "punjabi-specials",
    cuisine: RegionalCuisine.PUNJABI,
    price: 290,
    hasHalfOption: false,
    halfPrice: null,
    description:
      "Traditional slow-cooked mustard greens pounded with bathua and spinach, served with 2 makki rotis, white butter, and gur.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: true,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "20 mins",
    serves: "1-2 people",
    displayOrder: 12,
    customizationOptions: null,
  },
  {
    id: "dish-shahi-paneer",
    name: "Royal Shahi Paneer",
    slug: "royal-shahi-paneer",
    categorySlug: "punjabi-specials",
    cuisine: RegionalCuisine.PUNJABI,
    price: 330,
    hasHalfOption: true,
    halfPrice: 185,
    description:
      "Cottage cheese simmered in a luscious gravy of almonds, cashews, cardamom, and saffron threads.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "15 mins",
    serves: "2 people",
    displayOrder: 13,
    customizationOptions: null,
  },
  {
    id: "dish-dal-tadka",
    name: "Dhaba Style Dal Tadka (Double Chhonk)",
    slug: "dhaba-dal-tadka-double-chhonk",
    categorySlug: "punjabi-specials",
    cuisine: RegionalCuisine.PUNJABI,
    price: 210,
    hasHalfOption: true,
    halfPrice: 120,
    description:
      "Golden yellow toor and moong lentils tempered twice in pure desi ghee with cumin, garlic cloves, whole red chillies, and hing.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: true,
    preparationTime: "12 mins",
    serves: "2 people",
    displayOrder: 14,
    customizationOptions: null,
  },
  {
    id: "dish-matar-paneer",
    name: "Desi Dhaba Matar Paneer",
    slug: "desi-dhaba-matar-paneer",
    categorySlug: "punjabi-specials",
    cuisine: RegionalCuisine.PUNJABI,
    price: 270,
    hasHalfOption: true,
    halfPrice: 155,
    description:
      "Tender green peas and fresh paneer cubes cooked in a spiced tomato-onion curry with roasted cumin.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "15 mins",
    serves: "2 people",
    displayOrder: 15,
    customizationOptions: null,
  },

  // 3. Breads & Kulchas
  {
    id: "dish-amritsari-kulcha",
    name: "Amritsari Aloo Pyaaz Chur Chur Kulcha",
    slug: "amritsari-chur-chur-kulcha",
    categorySlug: "breads",
    cuisine: RegionalCuisine.PUNJABI,
    price: 130,
    hasHalfOption: false,
    halfPrice: null,
    description:
      "Flaky layered bread baked crisp in a clay tandoor, crushed by hand and smothered with desi ghee. Served with spicy chole and pickled onions.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: true,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "15 mins",
    serves: "1 person",
    displayOrder: 16,
    customizationOptions: null,
  },
  {
    id: "dish-paneer-kulcha",
    name: "Stuffed Paneer Chur Chur Kulcha",
    slug: "stuffed-paneer-chur-chur-kulcha",
    categorySlug: "breads",
    cuisine: RegionalCuisine.PUNJABI,
    price: 160,
    hasHalfOption: false,
    halfPrice: null,
    description:
      "Fresh grated spiced cottage cheese stuffed inside flaky tandoori dough, brushed with desi makhan and served with chole & tamarind chutney.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: true,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "15 mins",
    serves: "1 person",
    displayOrder: 17,
    customizationOptions: null,
  },
  {
    id: "dish-butter-naan",
    name: "Tandoori Butter Naan",
    slug: "tandoori-butter-naan",
    categorySlug: "breads",
    cuisine: RegionalCuisine.PUNJABI,
    price: 60,
    hasHalfOption: false,
    halfPrice: null,
    description:
      "Soft leavened refined flour flatbread cooked against the clay tandoor wall and brushed with butter.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "10 mins",
    serves: "1 person",
    displayOrder: 18,
    customizationOptions: null,
  },
  {
    id: "dish-garlic-naan",
    name: "Crispy Garlic Chur Chur Naan",
    slug: "garlic-chur-chur-naan",
    categorySlug: "breads",
    cuisine: RegionalCuisine.PUNJABI,
    price: 75,
    hasHalfOption: false,
    halfPrice: null,
    description:
      "Infused with roasted garlic cloves, fresh coriander, and nigella seeds.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "10 mins",
    serves: "1 person",
    displayOrder: 19,
    customizationOptions: null,
  },
  {
    id: "dish-laccha-paratha",
    name: "Crispy Multi-Layered Laccha Paratha",
    slug: "crispy-laccha-paratha",
    categorySlug: "breads",
    cuisine: RegionalCuisine.PUNJABI,
    price: 70,
    hasHalfOption: false,
    halfPrice: null,
    description:
      "Multi-layered stone-ground whole wheat paratha roasted crisp on tandoor and layered with pure desi ghee.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "10 mins",
    serves: "1 person",
    displayOrder: 20,
    customizationOptions: null,
  },
  {
    id: "dish-missi-roti",
    name: "Tandoori Missi Roti with Ajwain & Methi",
    slug: "tandoori-missi-roti",
    categorySlug: "breads",
    cuisine: RegionalCuisine.PUNJABI,
    price: 50,
    hasHalfOption: false,
    halfPrice: null,
    description:
      "Wholesome gram flour & wheat flatbread tempered with carom seeds, fresh fenugreek, and onions.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "8 mins",
    serves: "1 person",
    displayOrder: 21,
    customizationOptions: null,
  },
  {
    id: "dish-tandoori-roti",
    name: "Tandoori Roti (Whole Wheat)",
    slug: "tandoori-roti-whole-wheat",
    categorySlug: "breads",
    cuisine: RegionalCuisine.PUNJABI,
    price: 25,
    hasHalfOption: false,
    halfPrice: null,
    description: "100% stone-ground whole wheat roti baked in clay oven.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "5 mins",
    serves: "1 person",
    displayOrder: 22,
    customizationOptions: null,
  },

  // 4. Rice & Combos
  {
    id: "dish-rajma-chawal",
    name: "Pahadi Rajma Chawal Platter",
    slug: "pahadi-rajma-chawal",
    categorySlug: "rice",
    cuisine: RegionalCuisine.HIMACHALI,
    price: 200,
    hasHalfOption: true,
    halfPrice: 120,
    description:
      "Small red Himalayan kidney beans slow cooked with mountain herbs, served over fragrant long-grain Basmati rice with fresh salad and spicy pickle.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: true,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "10 mins",
    serves: "1 person",
    displayOrder: 23,
    customizationOptions: null,
  },
  {
    id: "dish-veg-pulao",
    name: "Kashmiri Shahi Veg Pulao with Dry Fruits",
    slug: "kashmiri-shahi-veg-pulao",
    categorySlug: "rice",
    cuisine: RegionalCuisine.COMMON,
    price: 230,
    hasHalfOption: true,
    halfPrice: 130,
    description:
      "Fragrant basmati rice tossed with garden fresh green peas, carrots, saffron threads, fried cashews, and raisins in desi ghee.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "15 mins",
    serves: "2 people",
    displayOrder: 24,
    customizationOptions: null,
  },
  {
    id: "dish-jeera-rice",
    name: "Desi Ghee Jeera Rice",
    slug: "desi-ghee-jeera-rice",
    categorySlug: "rice",
    cuisine: RegionalCuisine.COMMON,
    price: 150,
    hasHalfOption: true,
    halfPrice: 90,
    description:
      "Long grain aged Basmati rice tempered with roasted cumin seeds and desi ghee.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "10 mins",
    serves: "1-2 people",
    displayOrder: 25,
    customizationOptions: null,
  },

  // 5. Starters & Snacks
  {
    id: "dish-paneer-tikka",
    name: "Clay Oven Tandoori Paneer Tikka",
    slug: "clay-oven-paneer-tikka",
    categorySlug: "snacks",
    cuisine: RegionalCuisine.PUNJABI,
    price: 280,
    hasHalfOption: true,
    halfPrice: 160,
    description:
      "Fresh chunks of homemade paneer marinated in spiced hung curd, carom seeds, and mustard oil, roasted on iron skewers.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: true,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "20 mins",
    serves: "2 people",
    displayOrder: 26,
    customizationOptions: null,
  },
  {
    id: "dish-malai-paneer-tikka",
    name: "Royal Malai Paneer Tikka (Mild)",
    slug: "royal-malai-paneer-tikka",
    categorySlug: "snacks",
    cuisine: RegionalCuisine.PUNJABI,
    price: 290,
    hasHalfOption: true,
    halfPrice: 170,
    description:
      "Creamy marinated cottage cheese infused with cardamom, processed cheese, and fresh cream, char-grilled over embers.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "20 mins",
    serves: "2 people",
    displayOrder: 27,
    customizationOptions: null,
  },
  {
    id: "dish-mix-pakora",
    name: "Crispy Pahadi Mountain Pakora Platter",
    slug: "crispy-pahadi-mountain-pakoras",
    categorySlug: "snacks",
    cuisine: RegionalCuisine.HIMACHALI,
    price: 180,
    hasHalfOption: true,
    halfPrice: 105,
    description:
      "Crispy gram flour fritters of potato, paneer, mountain spinach, and onion, served with mint-coriander and sweet tamarind dips.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "15 mins",
    serves: "2 people",
    displayOrder: 28,
    customizationOptions: null,
  },

  // 6. Beverages
  {
    id: "dish-punjabi-lassi",
    name: "Dhaba Special Sweet Malai Lassi",
    slug: "dhaba-sweet-malai-lassi",
    categorySlug: "beverages",
    cuisine: RegionalCuisine.PUNJABI,
    price: 90,
    hasHalfOption: false,
    halfPrice: null,
    description:
      "Hand-churned thick curd drink infused with rose water, crushed cardamom, and topped with a thick dollop of fresh clotted cream (malai).",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1571006682894-3d0b284e389e?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "5 mins",
    serves: "1 person",
    displayOrder: 29,
    customizationOptions: null,
  },
  {
    id: "dish-mango-lassi",
    name: "Alphonso Mango Malai Lassi",
    slug: "alphonso-mango-malai-lassi",
    categorySlug: "beverages",
    cuisine: RegionalCuisine.PUNJABI,
    price: 110,
    hasHalfOption: false,
    halfPrice: null,
    description:
      "Rich creamy lassi blended with natural Alphonso mango pulp and saffron essence.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1571006682894-3d0b284e389e?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: true,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "5 mins",
    serves: "1 person",
    displayOrder: 30,
    customizationOptions: null,
  },
  {
    id: "dish-spiced-chaas",
    name: "Pahadi Spiced Buttermilk (Chaas)",
    slug: "pahadi-spiced-chaas",
    categorySlug: "beverages",
    cuisine: RegionalCuisine.HIMACHALI,
    price: 60,
    hasHalfOption: false,
    halfPrice: null,
    description:
      "Refreshing churned buttermilk tempered with roasted cumin, rock salt, ginger, and fresh mountain mint.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1571006682894-3d0b284e389e?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "5 mins",
    serves: "1 person",
    displayOrder: 31,
    customizationOptions: null,
  },
  {
    id: "dish-masala-chai",
    name: "Kulhad Masala Chai (Cardamom & Ginger)",
    slug: "kulhad-masala-chai",
    categorySlug: "beverages",
    cuisine: RegionalCuisine.COMMON,
    price: 40,
    hasHalfOption: false,
    halfPrice: null,
    description:
      "Strong Assam tea brewed with crushed ginger, green cardamom, cinnamon, and whole milk, served in traditional clay kulhad.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1571006682894-3d0b284e389e?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "5 mins",
    serves: "1 person",
    displayOrder: 32,
    customizationOptions: null,
  },

  // 7. Desserts
  {
    id: "dish-mittha-bhat",
    name: "Himachali Mittha Bhat (Saffron Sweet Rice)",
    slug: "himachali-mittha-bhat",
    categorySlug: "desserts",
    cuisine: RegionalCuisine.HIMACHALI,
    price: 150,
    hasHalfOption: true,
    halfPrice: 90,
    description:
      "Aromatic sweet Basmati rice slow-cooked with pure Kashmiri saffron, desi ghee, almonds, raisins, and green cardamom.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: true,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "10 mins",
    serves: "1-2 people",
    displayOrder: 33,
    customizationOptions: null,
  },
  {
    id: "dish-gulab-jamun",
    name: "Hot Shahi Gulab Jamun with Rabri (2 Pcs)",
    slug: "hot-gulab-jamun-rabri",
    categorySlug: "desserts",
    cuisine: RegionalCuisine.PUNJABI,
    price: 140,
    hasHalfOption: false,
    halfPrice: null,
    description:
      "Soft milk-solid dumplings fried in pure ghee and soaked in fragrant rose-cardamom sugar syrup, served with chilled creamy rabri.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: false,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "5 mins",
    serves: "1-2 people",
    displayOrder: 34,
    customizationOptions: null,
  },
  {
    id: "dish-gajar-halwa",
    name: "Desi Ghee Gajar Ka Halwa (Khoya Rich)",
    slug: "desi-ghee-gajar-ka-halwa",
    categorySlug: "desserts",
    cuisine: RegionalCuisine.PUNJABI,
    price: 160,
    hasHalfOption: true,
    halfPrice: 100,
    description:
      "Fresh grated red carrots simmered for hours with full-fat milk, roasted khoya, pure desi ghee, cashews, and green cardamom.",
    longDescription: null,
    imageUrl:
      "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
    isChefSpecial: true,
    isAvailable: true,
    isSpicy: false,
    preparationTime: "5 mins",
    serves: "1-2 people",
    displayOrder: 35,
    customizationOptions: null,
  },
];

async function main() {
  console.log("🌱 Seeding Family Vaishno Dhaba database...");

  // 1. Seed Admin Account
  const adminPasswordHash = await argon2.hash("fvd@123");
  const adminUser = await prisma.user.upsert({
    where: { email: "fvd@admin.com" },
    update: {
      name: "Family Vaishno Dhaba Admin",
      phone: "9816000000",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      email: "fvd@admin.com",
      name: "Family Vaishno Dhaba Admin",
      phone: "9816000000",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  // 2. Clean up obsolete Himachali Dham data
  try {
    await prisma.product.deleteMany({ where: { categoryId: "cat-himachali" } });
    await prisma.category.deleteMany({ where: { id: "cat-himachali" } });
  } catch {}

  // 3. Seed Categories (Upsert by id for idempotency)
  const categoryMap = new Map<string, string>();
  for (const cat of CATEGORIES_DATA) {
    const record = await prisma.category.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        imageUrl: cat.imageUrl,
        featured: cat.featured,
        displayOrder: cat.displayOrder,
        isActive: true,
      },
      create: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        imageUrl: cat.imageUrl,
        featured: cat.featured,
        displayOrder: cat.displayOrder,
        isActive: true,
      },
    });
    categoryMap.set(cat.slug, record.id);
  }
  console.log(`✅ Upserted ${CATEGORIES_DATA.length} categories.`);

  // 3. Seed Products with Half & Full Portion Pricing
  for (const dish of DISHES_DATA) {
    const categoryId = categoryMap.get(dish.categorySlug);
    if (!categoryId) {
      console.warn(
        `⚠️ Warning: Category slug "${dish.categorySlug}" not found for product "${dish.name}". Skipping.`,
      );
      continue;
    }

    await prisma.product.upsert({
      where: { slug: dish.slug },
      update: {
        name: dish.name,
        categoryId,
        description: dish.description,
        longDescription: dish.longDescription,
        price: dish.price,
        hasHalfOption: dish.hasHalfOption ?? false,
        halfPrice: dish.halfPrice !== undefined ? dish.halfPrice : null,
        isAvailable: dish.isAvailable,
        isChefSpecial: dish.isChefSpecial,
        cuisine: dish.cuisine,
        isSpicy: dish.isSpicy,
        preparationTime: dish.preparationTime,
        serves: dish.serves,
        customizationOptions: dish.customizationOptions
          ? (dish.customizationOptions as any)
          : undefined,
        imageUrl: dish.imageUrl,
        displayOrder: dish.displayOrder,
      },
      create: {
        id: dish.id,
        name: dish.name,
        slug: dish.slug,
        categoryId,
        description: dish.description,
        longDescription: dish.longDescription,
        price: dish.price,
        hasHalfOption: dish.hasHalfOption ?? false,
        halfPrice: dish.halfPrice !== undefined ? dish.halfPrice : null,
        isAvailable: dish.isAvailable,
        isChefSpecial: dish.isChefSpecial,
        cuisine: dish.cuisine,
        isSpicy: dish.isSpicy,
        preparationTime: dish.preparationTime,
        serves: dish.serves,
        customizationOptions: dish.customizationOptions
          ? (dish.customizationOptions as any)
          : undefined,
        imageUrl: dish.imageUrl,
        displayOrder: dish.displayOrder,
      },
    });
  }
  console.log(`✅ Upserted ${DISHES_DATA.length} authentic dishes with portion pricing.`);

  // 4. Seed Coupons
  const COUPONS_DATA = [
    {
      code: "DHABA50",
      title: "Flat ₹50 Off on Punjabi Classics",
      description: "Get flat ₹50 discount on authentic dhaba dishes",
      discountType: "FLAT",
      value: 50,
      minOrderAmount: 499,
      isActive: true,
    },
    {
      code: "HIMACHAL15",
      title: "15% Off on Himachali Dham",
      description: "Enjoy 15% discount on traditional Kangri Dham feasts",
      discountType: "PERCENT",
      value: 15,
      minOrderAmount: 600,
      maxDiscount: 150,
      isActive: true,
    },
    {
      code: "FIRSTFEAST",
      title: "Welcome 20% Off on First Order",
      description: "20% discount on your first order with Family Vaishno Dhaba",
      discountType: "PERCENT",
      value: 20,
      minOrderAmount: 350,
      maxDiscount: 100,
      isActive: true,
    },
    {
      code: "PUNJABI100",
      title: "Flat ₹100 Off on Mega Orders",
      description: "Flat ₹100 instant discount on orders above ₹799",
      discountType: "FLAT",
      value: 100,
      minOrderAmount: 799,
      isActive: true,
    },
  ];

  for (const coupon of COUPONS_DATA) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {
        title: coupon.title,
        description: coupon.description,
        discountType: coupon.discountType,
        value: coupon.value,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscount: coupon.maxDiscount || null,
        isActive: coupon.isActive,
      },
      create: {
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        discountType: coupon.discountType,
        value: coupon.value,
        minOrderAmount: coupon.minOrderAmount,
        maxDiscount: coupon.maxDiscount || null,
        isActive: coupon.isActive,
      },
    });
  }
  console.log(`✅ Upserted ${COUPONS_DATA.length} promotional coupons.`);

  console.log("🎉 Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

