export interface FoodItem {
  id: string
  name: string
  category: string
  price: number
  image: string
  description: string
  calories: number
  protein: string
  bunType?: string
  rating: number
  ratingCount?: string
  deliveryTime: string
  toppings: Topping[]
  sides: SideOption[]
}

export interface Topping {
  name: string
  image: string
  selected?: boolean
}

export interface SideOption {
  name: string
  image: string
  selected?: boolean
}

export interface CartItem {
  food: FoodItem
  quantity: number
  selectedToppings: string[]
  selectedSides: string[]
}

export interface UserProfile {
  fullName: string
  email: string
  phone: string
  mpesaNumber: string
  address: string
}

export const defaultProfile: UserProfile = {
  fullName: "",
  email: "",
  phone: "",
  mpesaNumber: "",
  address: "",
}

export const toppings: Topping[] = [
  { name: "Tomato", image: "/images/tomato.jpg" },
  { name: "Lettuce", image: "/images/lettuce.jpg" },
  { name: "Cheese", image: "/images/cheese.jpg" },
  { name: "Bacon", image: "/images/bacon.jpg" },
  { name: "Onions", image: "/images/onion.jpg" },
]

export const sides: SideOption[] = [
  { name: "Fries", image: "/images/fries.jpg" },
  { name: "Coleslaw", image: "/images/coleslaw.jpg" },
  { name: "Salad", image: "/images/salad.jpg" },
  { name: "Pringles", image: "/images/pringles.jpg" },
]

export const foodItems: FoodItem[] = [
  {
    id: "1",
    name: "Wendy's Burger",
    category: "Burgers",
    price: 10.02,
    image: "/images/burger.jpg",
    description: "The Cheeseburger Wendy's Burger is a classic fast food burger that packs a punch of flavor in every bite. Made with a juicy beef patty cooked to perfection, it's topped with melted American cheese, crispy lettuce, tomato, & crunchy pickles.",
    calories: 365,
    protein: "15g",
    bunType: "Whole Wheat",
    rating: 4.5,
    deliveryTime: "20 - 30 mins",
    toppings,
    sides,
  },
  {
    id: "2",
    name: "Veggie Burger",
    category: "Burgers",
    price: 10.4,
    image: "/images/veggie-burger.jpg",
    description: "A delicious plant-based burger made with fresh vegetables and a hearty veggie patty, topped with crisp lettuce, tomato, and our signature sauce.",
    calories: 280,
    protein: "12g",
    bunType: "Multigrain",
    rating: 4.3,
    deliveryTime: "20 - 30 mins",
    toppings,
    sides,
  },
  {
    id: "3",
    name: "Margherita Magic",
    category: "Pizza",
    price: 10.4,
    image: "/images/margherita.jpg",
    description: "Classic Italian pizza with fresh mozzarella, San Marzano tomato sauce, and fragrant basil leaves on a perfectly thin crust.",
    calories: 320,
    protein: "14g",
    rating: 4.7,
    deliveryTime: "25 - 35 mins",
    toppings,
    sides,
  },
  {
    id: "4",
    name: "Veggie Delight",
    category: "Pizza",
    price: 10.4,
    image: "/images/veggie-delight.jpg",
    description: "A colorful medley of fresh vegetables on a crispy pizza base with mozzarella cheese and herb-infused tomato sauce.",
    calories: 290,
    protein: "11g",
    rating: 4.2,
    deliveryTime: "25 - 35 mins",
    toppings,
    sides,
  },
  {
    id: "5",
    name: "Chicken Wrap",
    category: "Burrito",
    price: 10.4,
    image: "/images/chicken-wrap.jpg",
    description: "Tender grilled chicken strips wrapped in a warm flour tortilla with fresh lettuce, diced tomatoes, and creamy ranch dressing.",
    calories: 410,
    protein: "22g",
    rating: 4.4,
    deliveryTime: "15 - 25 mins",
    toppings,
    sides,
  },
  {
    id: "6",
    name: "Big Beef Burrito",
    category: "Burrito",
    price: 10.4,
    image: "/images/big-beef-burrito.jpg",
    description: "A hearty burrito packed with seasoned ground beef, Mexican rice, black beans, cheddar cheese, and fresh pico de gallo.",
    calories: 520,
    protein: "28g",
    rating: 4.6,
    deliveryTime: "15 - 25 mins",
    toppings,
    sides,
  },
]
