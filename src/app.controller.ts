import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      name: "Family Vaishno Dhaba API",
      status: "operational",
      version: "1.0.0",
      description:
        "Authentic Punjabi & Himachali Pure Vegetarian Cuisine Backend Service",
      endpoints: {
        health: "/api/health",
        menu: "/api/menu",
        categories: "/api/categories",
        orders: "/api/orders",
        payments: "/api/payments",
        auth: "/api/auth",
      },
    };
  }
}
