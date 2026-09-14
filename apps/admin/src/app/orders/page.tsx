"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { OrderResponse, OrderStatus } from "@repo/types";
import {
  fetchAdminOrdersApi,
  updateOrderStatusApi,
  rejectOrderApi,
} from "../../lib/api-orders";
import { Button, useToast } from "@repo/ui";
import {
  Search,
  ArrowRight,
  Eye,
  Phone,
  MapPin,
  RefreshCw,
  Loader2,
  Truck,
  Store,
  XCircle,
  AlertOctagon,
  X,
} from "lucide-react";

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  PENDING: {
    label: "Pending Desk",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
    dotClass: "bg-amber-500",
  },
  CONFIRMED: {
    label: "Confirmed",
    badgeClass: "bg-blue-100 text-blue-900 border-blue-300",
    dotClass: "bg-blue-500",
  },
  PREPARING: {
    label: "Cooking in Kitchen",
    badgeClass: "bg-orange-100 text-orange-950 border-orange-300",
    dotClass: "bg-orange-500 animate-pulse",
  },
  READY_FOR_PICKUP: {
    label: "Ready for Pickup",
    badgeClass: "bg-purple-100 text-purple-900 border-purple-300",
    dotClass: "bg-purple-500",
  },
  OUT_FOR_DELIVERY: {
    label: "Out for Delivery",
    badgeClass: "bg-cyan-100 text-cyan-900 border-cyan-300",
    dotClass: "bg-cyan-500",
  },
  DELIVERED: {
    label: "Delivered",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    dotClass: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled / Rejected",
    badgeClass: "bg-red-100 text-red-900 border-red-300",
    dotClass: "bg-red-500",
  },
};

const STATUS_TABS = [
  { label: "All Orders", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Preparing", value: "PREPARING" },
  { label: "Ready", value: "READY_FOR_PICKUP" },
  { label: "Out for Delivery", value: "OUT_FOR_DELIVERY" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const REJECTION_REASONS = [
  "Kitchen is overloaded with orders",
  "Requested dish ingredients out of stock",
  "Delivery location outside service area",
  "Customer phone unreachable / invalid address",
  "Restaurant closing for the day",
];

export default function AdminOrdersPage() {
  const { addToast } = useToast();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Rejection modal
  const [rejectModalOrder, setRejectModalOrder] = useState<OrderResponse | null>(null);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAdminOrdersApi({
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        search: search.trim() || undefined,
        limit: 100,
      });
      if (res.success && res.data?.orders) {
        setOrders(res.data.orders);
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to fetch orders from server.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, search, addToast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleUpdateStatus = async (
    orderId: string,
    newStatus: OrderStatus,
  ) => {
    setIsUpdating(orderId);
    try {
      const res = await updateOrderStatusApi(orderId, newStatus);
      if (res.success && res.data) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? res.data! : o)),
        );
        addToast({
          title: "Status Changed",
          description: `Order #${res.data.orderNumber} advanced to ${newStatus}.`,
          type: "success",
        });
      }
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectModalOrder) return;
    setIsRejecting(true);
    const finalReason = customReason.trim() || selectedReason || "Declined by kitchen";
    try {
      const res = await rejectOrderApi(rejectModalOrder.id, finalReason);
      if (res.success && res.data) {
        setOrders((prev) =>
          prev.map((o) => (o.id === rejectModalOrder.id ? res.data! : o)),
        );
        addToast({
          title: "Order Rejected",
          description: `Order #${rejectModalOrder.orderNumber} has been rejected.`,
          type: "info",
        });
        setRejectModalOrder(null);
        setCustomReason("");
      } else {
        addToast({
          title: "Action Failed",
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
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">
            Kitchen & Delivery Orders Queue
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage incoming orders, advance kitchen preparation stages, review portion sizes, or reject unserviceable orders.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadOrders}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {STATUS_TABS.map((st) => (
              <button
                key={st.value}
                onClick={() => setSelectedStatus(st.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedStatus === st.value
                    ? "bg-stone-900 text-white shadow-xs"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                <span>{st.label}</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by order #, phone, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#78350F]"
            />
          </div>
        </div>
      </div>

      {/* Orders List / Cards */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl border border-stone-200">
          <Loader2 className="w-8 h-8 animate-spin text-[#78350F]" />
          <p className="text-xs font-semibold text-stone-500">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-2">
          <p className="text-base font-bold text-stone-900">No Orders Found</p>
          <p className="text-xs text-stone-500">
            No customer orders match the current status filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || {
              label: order.status,
              badgeClass: "bg-stone-100 text-stone-800",
            };
            const isFinished = order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs hover:shadow-xs transition space-y-4"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-mono text-sm font-extrabold text-stone-900 hover:text-amber-900 underline-offset-2 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${cfg.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                      {cfg.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                      {order.orderType === "DELIVERY" ? (
                        <Truck className="w-3 h-3 text-amber-800" />
                      ) : (
                        <Store className="w-3 h-3 text-amber-800" />
                      )}
                      {order.orderType}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-stone-500">
                    <span>
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="font-black text-stone-900 text-sm">
                      ₹{order.totalAmount}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {order.paymentMethod}
                    </span>
                  </div>
                </div>

                {/* Middle Info Row */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                  {/* Customer Info */}
                  <div className="md:col-span-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      Customer Details
                    </span>
                    <p className="font-bold text-stone-900 text-sm">
                      {order.customerName}
                    </p>
                    <p className="text-stone-600 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />{" "}
                      {order.customerPhone}
                    </p>
                    {order.deliveryAddress && (
                      <p className="text-stone-500 flex items-start gap-1 mt-1 leading-snug">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                        <span>{order.deliveryAddress}, {order.city}</span>
                      </p>
                    )}
                    {order.notes && (
                      <p className="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded-lg border border-amber-200/60 mt-1.5 italic">
                        &ldquo;{order.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Items List with Portions */}
                  <div className="md:col-span-5 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      Ordered Dishes ({order.items.length})
                    </span>
                    <div className="space-y-1">
                      {order.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-stone-800 bg-stone-50/70 px-2.5 py-1 rounded-lg border border-stone-100"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-stone-900">
                              {it.quantity}x
                            </span>
                            <span className="font-medium">{it.productName}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 uppercase">
                              {it.portion === "HALF" ? "Half" : "Full"}
                            </span>
                          </div>
                          <span className="font-bold text-stone-900">
                            ₹{it.subtotal}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="md:col-span-3 flex flex-col justify-between items-end gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Kitchen Workflow
                    </span>
                    <div className="flex flex-col gap-1.5 w-full">
                      {order.status === OrderStatus.PENDING && (
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={isUpdating === order.id}
                          onClick={() =>
                            handleUpdateStatus(order.id, OrderStatus.CONFIRMED)
                          }
                          className="w-full justify-center"
                        >
                          Accept Order
                        </Button>
                      )}

                      {order.status === OrderStatus.CONFIRMED && (
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={isUpdating === order.id}
                          onClick={() =>
                            handleUpdateStatus(order.id, OrderStatus.PREPARING)
                          }
                          className="w-full justify-center"
                        >
                          Send to Kitchen
                        </Button>
                      )}

                      {order.status === OrderStatus.PREPARING && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isUpdating === order.id}
                          onClick={() =>
                            handleUpdateStatus(
                              order.id,
                              order.orderType === "DELIVERY"
                                ? OrderStatus.OUT_FOR_DELIVERY
                                : OrderStatus.READY_FOR_PICKUP,
                            )
                          }
                          className="w-full justify-center"
                        >
                          {order.orderType === "DELIVERY"
                            ? "Dispatch Rider"
                            : "Ready at Counter"}
                        </Button>
                      )}

                      {(order.status === OrderStatus.OUT_FOR_DELIVERY ||
                        order.status === OrderStatus.READY_FOR_PICKUP) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isUpdating === order.id}
                          onClick={() =>
                            handleUpdateStatus(order.id, OrderStatus.DELIVERED)
                          }
                          className="w-full justify-center"
                        >
                          Mark Delivered
                        </Button>
                      )}

                      {/* Reject / Cancel Button for active orders */}
                      {!isFinished && (
                        <button
                          type="button"
                          disabled={isUpdating === order.id}
                          onClick={() => {
                            setRejectModalOrder(order);
                            setSelectedReason(REJECTION_REASONS[0]);
                            setCustomReason("");
                          }}
                          className="w-full py-1 px-2 rounded-lg text-[11px] font-bold text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 transition text-center cursor-pointer"
                        >
                          Reject / Cancel Order
                        </button>
                      )}

                      <Link
                        href={`/orders/${order.id}`}
                        className="text-[11px] text-stone-500 hover:text-stone-900 font-medium text-center hover:underline pt-0.5"
                      >
                        View Full Details →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Order Modal */}
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
              <label className="font-bold text-stone-700 block">
                Select Rejection Reason:
              </label>
              <div className="space-y-1.5">
                {REJECTION_REASONS.map((r) => (
                  <label
                    key={r}
                    className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 hover:bg-stone-50 cursor-pointer font-medium text-stone-800"
                  >
                    <input
                      type="radio"
                      name="rejectionReason"
                      checked={selectedReason === r && !customReason}
                      onChange={() => {
                        setSelectedReason(r);
                        setCustomReason("");
                      }}
                      className="text-[#78350F] focus:ring-[#78350F]"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>

              <div className="pt-2">
                <label className="font-bold text-stone-700 block mb-1">
                  Or Custom Reason / Instructions:
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Out of paneer until 8 PM..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
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
