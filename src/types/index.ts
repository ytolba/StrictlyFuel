export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  ingredients: string[];
  affiliateUrl: string;
  category: string;
  isBased: boolean;
}
