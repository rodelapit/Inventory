import { Package, AlertTriangle, TrendingUp, Users } from "lucide-react";

export type StatCardIconName = "Package" | "AlertTriangle" | "TrendingUp" | "Users";

export type StatCard = {
  title: string;
  value: string | number;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  iconName: StatCardIconName;
};

export type ZoneCard = {
  zone: string;
  name: string;
  units: number;
  trend: string;
  trendUp: boolean;
};

export type ActiveAlert = {
  title: string;
  message: string;
  age: string;
  type: "warning" | "error" | "info";
};

export type ProductFeedItem = {
  sku: string;
  productName: string;
  stockLevel: number;
  expiration: string;
  status: "In Stock" | "Low" | "Critical";
};

export type DashboardData = {
  systemStatusTitle: string;
  systemStatusMessage: string;
  statCards: StatCard[];
  zoneCards: ZoneCard[];
  activeAlerts: ActiveAlert[];
  productFeed: ProductFeedItem[];
};

export const mockDashboardData: DashboardData = {
  systemStatusTitle: "System Synchronized",
  systemStatusMessage: "All store sensors are online. Next sync in 12 minutes.",
  statCards: [
    {
      title: "Total Products",
      value: 1847,
      change: "+12.5%",
      changeType: "positive",
      iconName: "Package",
    },
    {
      title: "Low Stock Items",
      value: 23,
      change: "-5.2%",
      changeType: "positive",
      iconName: "AlertTriangle",
    },
    {
      title: "Monthly Sales",
      value: "₱45,231",
      change: "+8.1%",
      changeType: "positive",
      iconName: "TrendingUp",
    },
    {
      title: "Active Users",
      value: 12,
      change: "+2",
      changeType: "positive",
      iconName: "Users",
    },
  ],
  zoneCards: [
    {
      zone: "ZONE A",
      name: "Ambient Storage",
      units: 12480,
      trend: "+3.8%",
      trendUp: true,
    },
    {
      zone: "ZONE B",
      name: "Cold Storage",
      units: 4210,
      trend: "-1.1%",
      trendUp: false,
    },
    {
      zone: "ZONE Q",
      name: "Quarantined Stock",
      units: 320,
      trend: "+0.6%",
      trendUp: true,
    },
  ],
  activeAlerts: [
    {
      title: "Low stock alert",
      message: "Coca-Cola stock is low",
      age: "2 hours ago",
      type: "warning",
    },
    {
      title: "Expiring soon",
      message: "Milk expires in 14 days",
      age: "5 hours ago",
      type: "error",
    },
  ],
  productFeed: [
    {
      sku: "PRD-1021",
      productName: "Coca-Cola",
      stockLevel: 184,
      expiration: "06/15/2026",
      status: "In Stock",
    },
    {
      sku: "PRD-1022",
      productName: "Instant Noodles Pack",
      stockLevel: 62,
      expiration: "04/30/2026",
      status: "Low",
    },
    {
      sku: "PRD-1023",
      productName: "Whole Milk",
      stockLevel: 28,
      expiration: "04/02/2026",
      status: "Critical",
    },
    {
      sku: "PRD-1024",
      productName: "Orange Juice",
      stockLevel: 145,
      expiration: "05/20/2026",
      status: "In Stock",
    },
    {
      sku: "PRD-1025",
      productName: "Chicken Breast",
      stockLevel: 45,
      expiration: "03/25/2026",
      status: "Low",
    },
    {
      sku: "PRD-1026",
      productName: "Greek Yogurt",
      stockLevel: 89,
      expiration: "04/15/2026",
      status: "In Stock",
    },
    {
      sku: "PRD-1027",
      productName: "Sliced Bread",
      stockLevel: 156,
      expiration: "03/30/2026",
      status: "In Stock",
    },
  ],
};
