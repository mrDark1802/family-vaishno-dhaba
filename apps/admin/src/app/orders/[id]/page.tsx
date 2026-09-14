import React, { useState, useEffect } from "react";
import { Link, useParams, useRouter } from "../../../context/navigation-context";
import { OrderResponse, OrderStatus } from "@repo/types";
import {
  fetchOrderDetailsApi,
  updateOrderStatusApi,
  rejectOrderApi,
} from "../../../lib/api-orders";
import { Button, useToast } from "@repo/ui";
import {
  ArrowLeft,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  Printer,
  Loader2,
  Truck,
  Store,
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

const REJECTION_REASONS = [
  "Kitchen is overloaded with orders",
  "Requested dish ingredients out of stock",
  "Delivery location outside service area",
  "Customer phone unreachable / invalid address",
  "Restaurant closing for the day",
];

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const orderId = Array.isArray(rawId) ? rawId[0] : (rawId as string);
  const { addToast } = useToast();

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Reject modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadOrder() {
      setIsLoading(true);
      try {
        const res = await fetchOrderDetailsApi(orderId);
        if (isMounted) {
          if (res.success && res.data) {
            setOrder(res.data);
          }
        }
      } catch {
        addToast({
          title: "Error",
          description: "Failed to load order from database.",
          type: "error",
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (orderId) loadOrder();
    return () => {
      isMounted = false;
    };
  }, [orderId, addToast]);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;
    setIsUpdating(true);
    try {
      const res = await updateOrderStatusApi(order.id, newStatus);
      if (res.success && res.data) {
        setOrder(res.data);
        addToast({
          title: "Status Advanced",
          description: `Order #${order.orderNumber} updated to ${newStatus}.`,
          type: "success",
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!order) return;
    setIsRejecting(true);
    const finalReason = customReason.trim() || selectedReason || "Declined by kitchen";
    try {
      const res = await rejectOrderApi(order.id, finalReason);
      if (res.success && res.data) {
        setOrder(res.data);
        addToast({
          title: "Order Rejected",
          description: `Order #${order.orderNumber} status changed to CANCELLED.`,
          type: "info",
        });
        setRejectModalOpen(false);
      } else {
        addToast({
          title: "Failed",
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

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#78350F]" />
        <p className="text-xs font-semibold text-stone-500">Loading order ticket...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-base font-bold text-stone-900">Order not found</p>
        <Link href="/orders">
          <Button variant="primary" size="sm">
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  const isFinished = order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orders Queue
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold"
        >
          <Printer className="w-3.5 h-3.5" /> Print Kitchen KOT
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-stone-900">
              Order #{order.orderNumber}
            </h1>
            {(() => {
              const cfg = STATUS_CONFIG[order.status] || {
                label: order.status,
                badgeClass: "bg-stone-100 text-stone-800 border-stone-200",
                dotClass: "bg-stone-400",
              };
              return (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${cfg.badgeClass}`}
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
                  {cfg.label}
                </span>
              );
            })()}
          </div>
          <p className="text-xs text-stone-400 mt-1">
            {new Date(order.createdAt).toLocaleString()} • Type: {order.orderType}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {order.status === OrderStatus.PENDING && (
            <Button
              size="sm"
              variant="primary"
              disabled={isUpdating}
              onClick={() => handleStatusChange(OrderStatus.CONFIRMED)}
            >
              Accept Order
            </Button>
          )}
          {order.status === OrderStatus.CONFIRMED && (
            <Button
              size="sm"
              variant="primary"
              disabled={isUpdating}
              onClick={() => handleStatusChange(OrderStatus.PREPARING)}
            >
              Send to Kitchen
            </Button>
          )}
          {order.status === OrderStatus.PREPARING && (
            <Button
              size="sm"
              variant="secondary"
              disabled={isUpdating}
              onClick={() =>
                handleStatusChange(
                  order.orderType === "DELIVERY"
                    ? OrderStatus.OUT_FOR_DELIVERY
                    : OrderStatus.READY_FOR_PICKUP,
                )
              }
            >
              {order.orderType === "DELIVERY" ? "Dispatch Rider" : "Ready at Counter"}
            </Button>
          )}
          {(order.status === OrderStatus.OUT_FOR_DELIVERY ||
            order.status === OrderStatus.READY_FOR_PICKUP) && (
            <Button
              size="sm"
              variant="secondary"
              disabled={isUpdating}
              onClick={() => handleStatusChange(OrderStatus.DELIVERED)}
            >
              Mark Delivered
            </Button>
          )}

          {!isFinished && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => {
                setRejectModalOpen(true);
                setSelectedReason(REJECTION_REASONS[0]);
                setCustomReason("");
              }}
              className="py-1.5 px-3 rounded-lg text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 transition cursor-pointer"
            >
              Reject / Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Grid: Items + Customer Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Ordered Items & Instructions */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-stone-200 p-6 space-y-5 shadow-2xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
            Kitchen Preparation List ({order.items.length} Dishes)
          </h2>

          <div className="divide-y divide-stone-100">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="py-3.5 first:pt-0 flex items-start justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-base text-stone-900">
                      {item.quantity}x
                    </span>
                    <span className="font-bold text-sm text-stone-900">
                      {item.productName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 uppercase">
                      {item.portion === "HALF" ? "Half Portion" : "Full Portion"}
                    </span>
                  </div>
                  {item.customization && (
                    <p className="text-xs text-stone-600 mt-0.5">
                      Style: {item.customization}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md mt-1 font-medium inline-block">
                      Note: {item.notes}
                    </p>
                  )}
                </div>
                <span className="font-bold text-sm text-stone-900">
                  ₹{item.subtotal}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-stone-200 space-y-2 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Item Subtotal</span>
              <span className="font-semibold text-stone-900">
                ₹{order.subtotal}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Charge</span>
              <span>Free</span>
            </div>
            <div className="pt-2 border-t border-stone-200 flex justify-between text-base font-extrabold text-stone-900">
              <span>Total Bill</span>
              <span className="text-amber-900">₹{order.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Right: Customer & Payment */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-2xs text-xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">
              Customer Details
            </h3>
            <div className="space-y-2">
              <p className="font-bold text-sm text-stone-900">
                {order.customerName}
              </p>
              <p className="text-stone-600 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-stone-400" />{" "}
                {order.customerPhone}
              </p>
              {order.deliveryAddress && (
                <p className="text-stone-600 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                  <span>{order.deliveryAddress}, {order.city}</span>
                </p>
              )}
              {order.notes && (
                <p className="text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                  Special Notes: &ldquo;{order.notes}&rdquo;
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 space-y-1">
              <span className="text-stone-400 uppercase tracking-wider text-[10px] font-bold">
                Payment Mode
              </span>
              <p className="font-bold text-stone-900">
                {order.paymentMethod} •{" "}
                <span className="text-emerald-700">{order.paymentStatus}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Order Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Reject Order #{order.orderNumber}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Customer: {order.customerName} (₹{order.totalAmount})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
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
                      name="rejectionReasonDetail"
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
                  Or Custom Reason / Notes:
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
                onClick={() => setRejectModalOpen(false)}
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
