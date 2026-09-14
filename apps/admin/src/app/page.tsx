"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  Badge,
  Input,
  Drawer,
  EmptyState,
  useToast,
} from "@repo/ui";
import {
  ShoppingBag,
  IndianRupee,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  Eye,
  SlidersHorizontal,
  Truck,
  Store,
  Phone,
  User,
  MapPin,
  Check,
  XCircle,
  Loader2,
} from "lucide-react";
import { OrderResponse, OrderStatus } from "@repo/types";
import {
  fetchAdminOrdersApi,
  fetchAdminStatsApi,
  updateOrderStatusApi,
  rejectOrderApi,
  AdminStatsResponse,
} from "../lib/api-orders";
import { AlertOctagon, X } from "lucide-react";


const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  [OrderStatus.PENDING]: {
    label: "Pending Desk",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
    dotClass: "bg-amber-500",
  },
  [OrderStatus.CONFIRMED]: {
    label: "Confirmed",
    badgeClass: "bg-blue-100 text-blue-900 border-blue-300",
    dotClass: "bg-blue-500",
  },
  [OrderStatus.PREPARING]: {
    label: "In Kitchen (Cooking)",
    badgeClass: "bg-orange-100 text-orange-950 border-orange-300",
    dotClass: "bg-orange-500 animate-pulse",
  },
  [OrderStatus.READY_FOR_PICKUP]: {
    label: "Ready for Pickup",
    badgeClass: "bg-purple-100 text-purple-900 border-purple-300",
    dotClass: "bg-purple-500",
  },
  [OrderStatus.OUT_FOR_DELIVERY]: {
    label: "Out for Delivery",
    badgeClass: "bg-cyan-100 text-cyan-900 border-cyan-300",
    dotClass: "bg-cyan-500",
  },
  [OrderStatus.DELIVERED]: {
    label: "Delivered",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    dotClass: "bg-emerald-500",
  },
  [OrderStatus.CANCELLED]: {
    label: "Cancelled / Rejected",
    badgeClass: "bg-red-100 text-red-900 border-red-300",
    dotClass: "bg-red-500",
  },
};

export default function AdminDashboardPage() {
  const { addToast } = useToast();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [stats, setStats] = useState<AdminStatsResponse>({
    todayRevenue: 0,
    todayOrders: 0,
    activeKitchenOrders: 0,
    completedOrders: 0,
    averageOrderValue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Rejection modal
  const [rejectModalOrder, setRejectModalOrder] = useState<OrderResponse | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetchAdminStatsApi(),
        fetchAdminOrdersApi({
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          search: filterQuery.trim() || undefined,
          limit: 30,
        }),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      if (ordersRes.success && ordersRes.data?.orders) {
        setOrders(ordersRes.data.orders);
      }
    } catch (err: any) {
      addToast({
        title: "Connection Error",
        description: "Failed to load latest operational data from backend.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, filterQuery, addToast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setIsUpdating(orderId);
    try {
      const res = await updateOrderStatusApi(orderId, newStatus);
      if (res.success && res.data) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? res.data! : o)),
        );
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(res.data);
        }
        addToast({
          title: "Status Updated",
          description: `Order #${res.data.orderNumber} is now ${STATUS_CONFIG[newStatus]?.label || newStatus}.`,
          type: "success",
        });
        fetchAdminStatsApi().then((s) => s.data && setStats(s.data));
      } else {
        addToast({
          title: "Update Failed",
          description: res.error || "Could not update status.",
          type: "error",
        });
      }
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectModalOrder) return;
    setIsRejecting(true);
    try {
      const res = await rejectOrderApi(rejectModalOrder.id, rejectReason || "Kitchen overloaded");
      if (res.success && res.data) {
        setOrders((prev) =>
          prev.map((o) => (o.id === rejectModalOrder.id ? res.data! : o)),
        );
        if (selectedOrder?.id === rejectModalOrder.id) {
          setSelectedOrder(res.data);
        }
        addToast({
          title: "Order Rejected",
          description: `Order #${rejectModalOrder.orderNumber} status changed to CANCELLED.`,
          type: "info",
        });
        setRejectModalOrder(null);
        setRejectReason("");
        fetchAdminStatsApi().then((s) => s.data && setStats(s.data));
      } else {
        addToast({
          title: "Reject Failed",
          description: res.error || "Could not reject order.",
          type: "error",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to reject order.",
        type: "error",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="primary" size="sm">
              Live Console
            </Badge>
            <Badge variant="success" size="sm">
              Kitchen Stream Active
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Family Vaishno Dhaba Operations
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Real-time live order dispatch, kitchen status transitions, and revenue metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadDashboardData();
              addToast({
                title: "Queue Refreshed",
                description: "Synchronized latest kitchen orders from database.",
                type: "info",
              });
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Queue</span>
          </Button>
          <Link href="/menu">
            <Button variant="primary" size="sm">
              <span>Manage Menu & Portions</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Core Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 space-y-2 bg-white border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider">
            <span>Today&apos;s Revenue</span>
            <IndianRupee className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-stone-900">
            ₹{stats.todayRevenue.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Pure Veg Food Orders
          </p>
        </Card>

        <Card className="p-5 space-y-2 bg-white border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider">
            <span>Orders Today</span>
            <ShoppingBag className="w-4 h-4 text-amber-800" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-stone-900">
            {stats.todayOrders}
          </p>
          <p className="text-[11px] text-stone-500 font-medium">
            Average Order: ₹{stats.averageOrderValue}
          </p>
        </Card>

        <Card className="p-5 space-y-2 bg-white border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider">
            <span>Active in Kitchen</span>
            <Flame className="w-4 h-4 text-[#B43403]" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#B43403]">
            {stats.activeKitchenOrders}
          </p>
          <p className="text-[11px] text-amber-800 font-semibold">
            Preparing & Out for Delivery
          </p>
        </Card>

        <Card className="p-5 space-y-2 bg-white border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase tracking-wider">
            <span>Completed Orders</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-stone-900">
            {stats.completedOrders}
          </p>
          <p className="text-[11px] text-emerald-700 font-semibold">
            Delivered successfully
          </p>
        </Card>
      </div>

      {/* 3. Live Order Stream & Status Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Live Orders Queue</h2>
            <p className="text-xs text-stone-500">
              Review portion selections, customer notes, and update kitchen prep stage.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative min-w-[220px]">
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search order #, customer..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-800 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#78350F]"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg text-xs overflow-x-auto">
              {["ALL", "PENDING", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition whitespace-nowrap ${
                    statusFilter === st
                      ? "bg-white text-stone-900 shadow-2xs"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {st === "ALL" ? "All Orders" : st.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-7 h-7 animate-spin text-[#78350F]" />
            <p className="text-xs text-stone-500 font-medium">Fetching orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="text-sm font-bold text-stone-800">No orders found</p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              There are currently no orders matching the selected filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Order #</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Items & Portion</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                {orders.map((order) => {
                  const cfg = STATUS_CONFIG[order.status] || {
                    label: order.status,
                    variant: "default",
                  };
                  return (
                    <tr key={order.id} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-stone-900 block">
                          {order.orderNumber}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-bold text-stone-900 block">
                          {order.customerName}
                        </span>
                        <span className="text-[11px] text-stone-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-stone-400" />
                          {order.customerPhone}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 max-w-xs">
                        <div className="space-y-1">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-stone-800">
                                {it.quantity}x {it.productName}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 uppercase">
                                {it.portion === "HALF" ? "Half" : "Full"}
                              </span>
                              {it.customization && (
                                <span className="text-[10px] text-stone-400">
                                  ({it.customization})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-extrabold text-stone-900 block text-sm">
                          ₹{order.totalAmount}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700">
                          {order.paymentMethod}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-700">
                          {order.orderType === "DELIVERY" ? (
                            <Truck className="w-3.5 h-3.5 text-amber-800" />
                          ) : (
                            <Store className="w-3.5 h-3.5 text-amber-800" />
                          )}
                          {order.orderType}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wide whitespace-nowrap ${cfg.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                          {cfg.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Workflow Stage Buttons */}
                          {order.status === OrderStatus.PENDING && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="primary"
                                disabled={isUpdating === order.id}
                                onClick={() =>
                                  handleStatusChange(order.id, OrderStatus.CONFIRMED)
                                }
                              >
                                Confirm
                              </Button>
                              <button
                                type="button"
                                disabled={isUpdating === order.id}
                                onClick={() => {
                                  setRejectModalOrder(order);
                                  setRejectReason("");
                                }}
                                className="px-2 py-1 text-[11px] font-bold text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-lg transition cursor-pointer"
                                title="Reject Order"
                              >
                                Reject
                              </button>
                            </div>
                          )}

                          {order.status === OrderStatus.CONFIRMED && (
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={isUpdating === order.id}
                              onClick={() =>
                                handleStatusChange(order.id, OrderStatus.PREPARING)
                              }
                            >
                              Start Cooking
                            </Button>
                          )}

                          {order.status === OrderStatus.PREPARING && (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={isUpdating === order.id}
                              onClick={() =>
                                handleStatusChange(
                                  order.id,
                                  order.orderType === "DELIVERY"
                                    ? OrderStatus.OUT_FOR_DELIVERY
                                    : OrderStatus.READY_FOR_PICKUP,
                                )
                              }
                            >
                              {order.orderType === "DELIVERY"
                                ? "Dispatch"
                                : "Ready"}
                            </Button>
                          )}

                          {(order.status === OrderStatus.OUT_FOR_DELIVERY ||
                            order.status === OrderStatus.READY_FOR_PICKUP) && (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={isUpdating === order.id}
                              onClick={() =>
                                handleStatusChange(order.id, OrderStatus.DELIVERED)
                              }
                            >
                              Mark Delivered
                            </Button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setDrawerOpen(true);
                            }}
                            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                            title="View Full Order Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Order Details Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedOrder ? `Order #${selectedOrder.orderNumber}` : "Order Details"}
        description={
          selectedOrder
            ? `Placed on ${new Date(selectedOrder.createdAt).toLocaleDateString()} at ${new Date(selectedOrder.createdAt).toLocaleTimeString()}`
            : ""
        }
        position="right"
        maxWidth="lg"
      >
        {selectedOrder && (
          <div className="space-y-6 text-xs text-stone-800">
            {/* Customer Information Card */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <span className="font-bold uppercase tracking-wider text-[10px] text-stone-400 block">
                Customer & Delivery Information
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-stone-500 block">Name:</span>
                  <span className="font-bold text-stone-900">
                    {selectedOrder.customerName}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">Phone:</span>
                  <span className="font-bold text-stone-900">
                    {selectedOrder.customerPhone}
                  </span>
                </div>
              </div>

              {selectedOrder.deliveryAddress && (
                <div className="pt-2 border-t border-stone-200">
                  <span className="text-stone-500 block">Delivery Address:</span>
                  <span className="font-medium text-stone-800 block">
                    {selectedOrder.deliveryAddress}
                    {selectedOrder.landmark ? `, Near ${selectedOrder.landmark}` : ""}
                    , {selectedOrder.city} - {selectedOrder.pincode}
                  </span>
                </div>
              )}

              {selectedOrder.notes && (
                <div className="pt-2 border-t border-stone-200">
                  <span className="text-stone-500 block">Special Instructions:</span>
                  <span className="font-medium text-amber-900 italic block">
                    &ldquo;{selectedOrder.notes}&rdquo;
                  </span>
                </div>
              )}
            </div>

            {/* Ordered Items with Portions */}
            <div className="space-y-3">
              <span className="font-bold uppercase tracking-wider text-[10px] text-stone-400 block">
                Itemized Dishes ({selectedOrder.items.length})
              </span>
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden bg-white">
                {selectedOrder.items.map((it) => (
                  <div key={it.id} className="p-3.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-stone-900 text-sm">
                          {it.quantity}x {it.productName}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 uppercase">
                          {it.portion === "HALF" ? "Half Portion" : "Full Portion"}
                        </span>
                      </div>
                      {it.customization && (
                        <span className="text-xs text-stone-500 block mt-0.5">
                          Style: {it.customization}
                        </span>
                      )}
                    </div>
                    <span className="font-black text-stone-900 text-sm">
                      ₹{it.subtotal}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1.5">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span>₹{selectedOrder.subtotal}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Delivery:</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between text-sm font-black text-stone-900 pt-2 border-t border-amber-200">
                <span>Total Amount:</span>
                <span>₹{selectedOrder.totalAmount}</span>
              </div>
            </div>

            {/* Quick Status Changers */}
            <div className="space-y-2 pt-2">
              <span className="font-bold uppercase tracking-wider text-[10px] text-stone-400 block">
                Update Order Status
              </span>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(OrderStatus).map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={isUpdating === selectedOrder.id || selectedOrder.status === st}
                    onClick={() => handleStatusChange(selectedOrder.id, st)}
                    className={`py-2 px-2.5 rounded-lg font-bold text-xs border text-center transition cursor-pointer ${
                      selectedOrder.status === st
                        ? "bg-stone-900 text-white border-stone-900"
                        : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    {st.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Reject Button in Drawer */}
            {selectedOrder.status !== OrderStatus.DELIVERED && selectedOrder.status !== OrderStatus.CANCELLED && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalOrder(selectedOrder);
                    setRejectReason("");
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 font-bold text-xs transition cursor-pointer"
                >
                  Reject / Cancel Order
                </button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Dashboard Rejection Modal */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Reject Order #{rejectModalOrder.orderNumber}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Customer: {rejectModalOrder.customerName} (₹{rejectModalOrder.totalAmount})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Rejection Reason / Notes:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kitchen overloaded / Out of stock"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#78350F]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejectModalOrder(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isRejecting}
                onClick={handleRejectOrder}
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <span>Confirm Rejection</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

