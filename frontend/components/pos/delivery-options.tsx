"use client";

import React, { useState, useEffect } from "react";
import { Truck, Home, Package, Bike, Banknote, CreditCard, Smartphone, MapPin, ArrowRight, CheckCircle } from "lucide-react";
import { deliveryService } from "../../lib/delivery-service";
import { toast } from "sonner";
import { OrderDetails } from "./types";

type UpdateOrderDetails = (details: Partial<OrderDetails>) => void;

export function DeliveryOptions({ orderDetails, onUpdateOrderDetails, total = 0, deliveryFee = 0 }: { orderDetails: OrderDetails; onUpdateOrderDetails: UpdateOrderDetails; total?: number; deliveryFee?: number }) {
  // Always set item type to Parcel (2) for Pathao
  useEffect(() => {
    if (orderDetails.courierService === "pathao" && orderDetails.pathaoItemType !== 2) {
      onUpdateOrderDetails({ pathaoItemType: 2 });
    }
  }, [orderDetails.courierService]);
  // Keep recipient details in sync with customer details for Pathao
  useEffect(() => {
    if (orderDetails.courierService === "pathao") {
      const updates: Partial<OrderDetails> = {};
      if (orderDetails.customerName && orderDetails.customerName.trim() && orderDetails.recipientName !== orderDetails.customerName) {
        updates.recipientName = orderDetails.customerName;
      }
      if (orderDetails.customerPhone && orderDetails.customerPhone.trim() && orderDetails.recipientPhone !== orderDetails.customerPhone) {
        updates.recipientPhone = orderDetails.customerPhone;
      }
      if (orderDetails.customerEmail && orderDetails.customerEmail.trim() && orderDetails.recipientEmail !== orderDetails.customerEmail) {
        updates.recipientEmail = orderDetails.customerEmail;
      }
      if (Object.keys(updates).length > 0) {
        onUpdateOrderDetails(updates);
      }
    }
  }, [orderDetails.customerName, orderDetails.customerPhone, orderDetails.customerEmail, orderDetails.courierService]);
  const [pathaoFieldError, setPathaoFieldError] = useState<string | null>(null);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [deliveryProviders, setDeliveryProviders] = useState({ steadfast: false, paperfly: false, pathao: false });
  const [pathaoError, setPathaoError] = useState<string | null>(null);
  const [pathaoStores, setPathaoStores] = useState<any[]>([]);
  const [pathaoCities, setPathaoCities] = useState<any[]>([]);
  const [pathaoZones, setPathaoZones] = useState<any[]>([]);
  const [pathaoAreas, setPathaoAreas] = useState<any[]>([]);
  const [loadingPathaoData, setLoadingPathaoData] = useState(false);
  const [loadingPathaoPrice, setLoadingPathaoPrice] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    checkDeliveryProvidersAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkDeliveryProvidersAvailability = async () => {
    try {
      const result: any = await deliveryService.getAvailableCourierProviders();
      setDeliveryProviders({
        steadfast: result.providers?.includes("steadfast"),
        paperfly: result.providers?.includes("paperfly"),
        pathao: result.providers?.includes("pathao"),
      });
      if (!result.providers?.includes("pathao")) {
        setPathaoError("Pathao is not enabled for your account. Please contact support.");
      } else {
        setPathaoError(null);
      }
    } catch (error) {
      setPathaoError("Failed to check Pathao availability. Please try again later.");
      console.error("Failed to check delivery providers availability:", error);
    }
  };

  const normalizeArray = (res: any): any[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    if (Array.isArray(res.stores)) return res.stores;
    if (Array.isArray(res.results)) return res.results;
    return [];
  };

  useEffect(() => {
    if (orderDetails.courierService === "pathao") {
      loadPathaoData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderDetails.courierService]);

  const loadPathaoData = async () => {
    setLoadingPathaoData(true);
    try {
      const [storesRes, citiesRes] = await Promise.all([
        deliveryService.getPathaoStores(),
        deliveryService.getPathaoCities(),
      ]);
      setPathaoStores(normalizeArray(storesRes));
      setPathaoCities(normalizeArray(citiesRes));
    } catch (error) {
      console.error("Failed to load Pathao data:", error);
    } finally {
      setLoadingPathaoData(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const shouldCalculate =
      orderDetails.courierService === "pathao" &&
      orderDetails.pathaoStoreId &&
      orderDetails.pathaoRecipientCity &&
      orderDetails.pathaoRecipientZone &&
      orderDetails.pathaoItemWeight;

    if (!shouldCalculate) return;

    const calculate = async () => {
      setLoadingPathaoPrice(true);
      onUpdateOrderDetails({ pathaoPriceLoading: true });
      try {
        const payload = {
          store_id: Number(orderDetails.pathaoStoreId),
          item_type: 2, // Always Parcel
          delivery_type: 48,
          item_weight: Number(orderDetails.pathaoItemWeight),
          recipient_city: Number(orderDetails.pathaoRecipientCity),
          recipient_zone: Number(orderDetails.pathaoRecipientZone),
          recipient_area: orderDetails.pathaoRecipientArea ? Number(orderDetails.pathaoRecipientArea) : undefined,
        };
        const res: any = await deliveryService.getPathaoPricePlan(payload);
        const price = res?.final_price ?? res?.price ?? (res?.data && (res.data.final_price || res.data.price));
        if (mounted && typeof price === "number") {
          onUpdateOrderDetails({ deliveryFee: price });
        }
      } catch (err) {
        console.error("Failed to calculate Pathao price", err);
      } finally {
        setLoadingPathaoPrice(false);
        onUpdateOrderDetails({ pathaoPriceLoading: false });
      }
    };

    // Debounce calculation for 300ms after any change
    const t = setTimeout(calculate, 10);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [
    orderDetails.courierService,
    orderDetails.pathaoStoreId,
    orderDetails.pathaoRecipientCity,
    orderDetails.pathaoRecipientZone,
    orderDetails.pathaoRecipientArea,
    orderDetails.pathaoItemWeight,
  ]);

  const handleDeliveryTypeChange = (deliveryType: string) => {
    setCurrentStep(2);
    onUpdateOrderDetails({
      deliveryType: deliveryType as "pickup" | "delivery" | "steadfast" | "paperfly" | "",
      paymentMethod: "",
      transactionId: "",
      mobileProvider: "",
      cardType: "",
    });
  };

  const handlePaymentMethodSelect = (method: string) => {
    setCurrentStep(3);
    onUpdateOrderDetails({
      paymentMethod: method as "cash" | "card" | "mobile" | "delivery_partner" | "cod" | "",
      transactionId: method === "cash" || method === "cod" || method === "delivery_partner" ? "" : orderDetails.transactionId,
      mobileProvider: method === "mobile" ? orderDetails.mobileProvider : "",
      cardType: method === "card" ? orderDetails.cardType : "",
    });
  };

  const getDeliveryTypeLabel = () => {
    if (!orderDetails.deliveryType) return "Select Delivery Method";
    let deliveryLabel = "";
    switch (orderDetails.deliveryType) {
      case "pickup":
        deliveryLabel = "Pickup from Store";
        break;
      case "delivery":
        if (orderDetails.courierService) {
          deliveryLabel = `${orderDetails.courierService.charAt(0).toUpperCase() + orderDetails.courierService.slice(1)} Courier`;
        } else {
          deliveryLabel = "Home Delivery";
        }
        break;
      default:
        deliveryLabel = "Select Delivery Type";
    }
    if (orderDetails.paymentMethod) {
      let paymentLabel = "";
      switch (orderDetails.paymentMethod) {
        case "cash":
          paymentLabel = "Cash";
          break;
        case "cod":
          paymentLabel = "Cash on Delivery";
          break;
        case "card":
          paymentLabel = "Card";
          break;
        case "mobile":
          paymentLabel = orderDetails.mobileProvider ? orderDetails.mobileProvider.charAt(0).toUpperCase() + orderDetails.mobileProvider.slice(1) : "Mobile";
          break;
        case "delivery_partner":
          paymentLabel = "Via Delivery Partner";
          break;
      }
      return `${deliveryLabel} \u2022 ${paymentLabel}`;
    }
    return deliveryLabel;
  };

  const getDeliveryIcon = () => {
    switch (orderDetails.deliveryType) {
      case "pickup":
        return <Home className="w-6 h-6 text-gray-700 dark:text-gray-300" />;
      case "delivery":
        if (orderDetails.courierService === "steadfast") return <Package className="w-6 h-6 text-gray-700 dark:text-gray-300" />;
        return <Truck className="w-6 h-6 text-gray-700 dark:text-gray-300" />;
      default:
        return <MapPin className="w-6 h-6 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getPaymentMethodIcon = () => {
    switch (orderDetails.paymentMethod) {
      case "cash":
      case "cod":
        return <Banknote className="w-5 h-5 text-gray-700 dark:text-gray-300" />;
      case "card":
        return <CreditCard className="w-5 h-5 text-gray-700 dark:text-gray-300" />;
      case "mobile":
        return <Smartphone className="w-5 h-5 text-gray-700 dark:text-gray-300" />;
      case "delivery_partner":
        return <Truck className="w-5 h-5 text-gray-700 dark:text-gray-300" />;
      default:
        return null;
    }
  };

  const getAvailablePaymentMethods = () => {
    if (!orderDetails.deliveryType) return [];
    const commonMethods = [
      { id: "cash", label: "Cash Payment", icon: <Banknote className="w-6 h-6 text-gray-700 dark:text-gray-300" />, description: "Pay with cash at pickup" },
      { id: "card", label: "Card Payment", icon: <CreditCard className="w-6 h-6 text-gray-700 dark:text-gray-300" />, description: "Credit or debit card" },
      { id: "mobile", label: "Mobile Payment", icon: <Smartphone className="w-6 h-6 text-gray-700 dark:text-gray-300" />, description: "bKash, Nagad, Rocket, Upay" },
    ];
    if (orderDetails.deliveryType === "pickup") return commonMethods;
    const amountDue = typeof orderDetails.amountDue === "number" && !isNaN(orderDetails.amountDue)
      ? orderDetails.amountDue
      : total;
    let codDescription = `Pay ৳${amountDue.toLocaleString()} on delivery`;
    if (orderDetails.deliveryType === "delivery") {
      if (orderDetails.waiveDeliveryFee) {
        codDescription += ` (delivery fee waived)`;
      } else if ((orderDetails.deliveryFee ?? 0) > 0) {
        codDescription += ` (includes ৳${orderDetails.deliveryFee ?? 0} delivery fee)`;
      }
      if (orderDetails.courierService) {
        codDescription += ` (via ${orderDetails.courierService.charAt(0).toUpperCase() + orderDetails.courierService.slice(1)} Courier)`;
      }
    }
    return [
      { id: "cod", label: "Cash on Delivery", icon: <Banknote className="w-6 h-6 text-gray-700 dark:text-gray-300" />, description: codDescription },
      ...commonMethods,
    ];
  };

  const requiresTransactionId = orderDetails.paymentMethod === "card" || orderDetails.paymentMethod === "mobile";

  const isFormValid = () => {
    if (!orderDetails.deliveryType || !orderDetails.paymentMethod) return false;
    if (orderDetails.deliveryType === "delivery" && orderDetails.courierService !== "pathao" && !orderDetails.deliveryAddress?.trim()) {
      return false;
    }
    if (orderDetails.deliveryType === "delivery" && orderDetails.courierService === "pathao") {
      // Pathao: recipient_name required and item_type must be 2 (Parcel)
      if (!orderDetails.pathaoStoreId || !orderDetails.pathaoRecipientCity || !orderDetails.pathaoRecipientZone) return false;
      if (!orderDetails.recipientName || !orderDetails.recipientName.trim()) return false;
      if (orderDetails.pathaoItemType !== 2) return false;
    }
    if (requiresTransactionId) {
      if (!orderDetails.transactionId?.trim()) return false;
      if (orderDetails.paymentMethod === "mobile" && !orderDetails.mobileProvider) return false;
      if (orderDetails.paymentMethod === "card" && !orderDetails.cardType) return false;
    }
    return true;
  };

  const handleNextStep = () => {
    // Pathao error handling
    if (currentStep === 2 && orderDetails.courierService === "pathao") {
      if (!orderDetails.recipientName || !orderDetails.recipientName.trim()) {
        setPathaoFieldError("Recipient name is required for Pathao deliveries.");
        return;
      }
      setPathaoFieldError(null);
    }
    if (currentStep < 3) setCurrentStep(currentStep + 1);
    else {
      setShowDeliveryDialog(false);
      toast.success("Delivery and payment options saved!");
    }
  };

  return (
    <div className="relative">
      {/* Dialog Trigger */}
      <button
        className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-900 border rounded hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        onClick={() => setShowDeliveryDialog(true)}
        style={{ minHeight: 40 }}
      >
        <div className="flex items-center gap-2 w-0 flex-1">
          {getDeliveryIcon()}
          {getPaymentMethodIcon()}
          <span
            className="text-base font-small text-gray-900 dark:text-gray-100 break-words whitespace-normal truncate"
            style={{ maxWidth: "90%" }}
          >
            {getDeliveryTypeLabel()}
          </span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>

      {/* Dialog Content */}
      {showDeliveryDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg w-full max-w-5xl max-h-[95vh] overflow-y-auto mx-2 sm:mx-4">
            {/* Progress Bar */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Checkout Journey</h2>
                <button onClick={() => setShowDeliveryDialog(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  ✕
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {["Delivery Method", "Delivery Details", "Payment"].map((step, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm font-medium ${currentStep > index + 1
                      ? "bg-green-500 border-green-500 text-white"
                      : currentStep === index + 1
                        ? "bg-gray-900 dark:bg-gray-100 border-gray-900 dark:border-gray-100 text-white dark:text-gray-900"
                        : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
                      }`}>
                      {currentStep > index + 1 ? <CheckCircle className="w-5 h-5" /> : index + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{step}</span>
                    {index < 2 && <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="p-6 space-y-6">
              {/* Step 1: Delivery Method */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100">Choose Your Delivery Method</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      className={`p-4 rounded-lg border flex items-center gap-3 ${orderDetails.deliveryType === "delivery"
                        ? "bg-gray-900 dark:bg-gray-100 border-gray-900 dark:border-gray-100 text-white dark:text-gray-900"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-100"
                        } transition-colors`}
                      onClick={() => handleDeliveryTypeChange("delivery")}
                    >
                      <Truck className={`w-8 h-8 ${orderDetails.deliveryType === "delivery" ? "text-white dark:text-gray-900" : "text-gray-700 dark:text-gray-300"}`} />
                      <div className="text-left">
                        <div className="font-medium text-lg">Home Delivery</div>
                        <div className={`text-sm ${orderDetails.deliveryType === "delivery" ? "text-gray-200 dark:text-gray-700" : "text-gray-500 dark:text-gray-400"}`}>
                          {orderDetails.waiveDeliveryFee ? "Delivery fee waived" : `৳${orderDetails.deliveryFee || deliveryFee} delivery fee`}
                        </div>
                      </div>
                    </button>
                    <button
                      className={`p-4 rounded-lg border flex items-center gap-3 ${orderDetails.deliveryType === "pickup"
                        ? "bg-gray-900 dark:bg-gray-100 border-gray-900 dark:border-gray-100 text-white dark:text-gray-900"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-100"
                        } transition-colors`}
                      onClick={() => handleDeliveryTypeChange("pickup")}
                    >
                      <Home className={`w-8 h-8 ${orderDetails.deliveryType === "pickup" ? "text-white dark:text-gray-900" : "text-gray-700 dark:text-gray-300"}`} />
                      <div className="text-left">
                        <div className="font-medium text-lg">Pickup from Store</div>
                        <div className={`text-sm ${orderDetails.deliveryType === "pickup" ? "text-gray-200 dark:text-gray-700" : "text-gray-500 dark:text-gray-400"}`}>No additional charges</div>
                      </div>
                    </button>

                  </div>
                </div>
              )}

              {/* Step 2: Delivery Details */}
              {currentStep === 2 && orderDetails.deliveryType === "delivery" && (
                <div className="space-y-6">
                  <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100">Delivery Details</h3>
                  <div className="space-y-4">
                    {/* Courier Selection */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Courier Service</label>
                      {pathaoError && (
                        <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded">{pathaoError}</div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { id: "none", name: "No Courier", icon: <MapPin className="w-6 h-6 text-gray-700 dark:text-gray-300" /> },
                          { id: "steadfast", name: "Steadfast", icon: <Package className="w-6 h-6 text-gray-700 dark:text-gray-300" />, disabled: !deliveryProviders.steadfast },
                          { id: "paperfly", name: "Paperfly", icon: <Package className="w-6 h-6 text-gray-700 dark:text-gray-300" />, disabled: !deliveryProviders.paperfly },
                          { id: "pathao", name: "Pathao", icon: <Bike className="w-6 h-6 text-gray-700 dark:text-gray-300" />, disabled: !deliveryProviders.pathao }
                        ].map((courier) => (
                          <button
                            key={courier.id}
                            className={`p-4 rounded-lg border flex items-center gap-3 ${orderDetails.courierService === courier.id
                              ? "bg-gray-900 dark:bg-gray-100 border-gray-900 dark:border-gray-100 text-white dark:text-gray-900"
                              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-100"
                              } ${courier.disabled ? "opacity-50 cursor-not-allowed" : ""} transition-colors`}
                            onClick={() => !courier.disabled && onUpdateOrderDetails({ courierService: courier.id === "none" ? undefined : courier.id as "steadfast" | "paperfly" | "pathao" | "" })}
                            disabled={courier.disabled}
                          >
                            {courier.icon}
                            <div className="text-left">
                              <div className="font-medium">{courier.name}</div>
                              <div className={`text-xs ${orderDetails.courierService === courier.id
                                ? "text-gray-200 dark:text-gray-700"
                                : "text-gray-500 dark:text-gray-400"
                                }`}>
                                {courier.id === "none"
                                  ? "Standard delivery"
                                  : courier.id === "steadfast"
                                    ? (deliveryProviders.steadfast ? "Integrated" : "Not Configured")
                                    : courier.id === "paperfly"
                                      ? (deliveryProviders.paperfly ? "Tracking Only" : "Not Configured")
                                      : deliveryProviders.pathao
                                        ? "Fast & Reliable"
                                        : "Not Enabled"}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pathao Specific Options */}
                    {orderDetails.courierService === "pathao" && (
                      <div className="space-y-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                        {pathaoFieldError && (
                          <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded">{pathaoFieldError}</div>
                        )}
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Pathao Delivery Options</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Store</label>
                            <select
                              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
                              value={orderDetails.pathaoStoreId || "none"}
                              onChange={(e) => {
                                const storeId = e.target.value === "none" ? undefined : e.target.value;
                                onUpdateOrderDetails({ pathaoStoreId: storeId });
                              }}
                            >
                              <option value="none">{loadingPathaoData ? "Loading..." : "Select Store"}</option>
                              {pathaoStores.map((s: any) => (
                                <option key={s.store_id || s.storeId || s.id} value={String(s.store_id || s.storeId || s.id)}>
                                  {s.store_name || s.storeName || `Store ${s.store_id || s.id}`}
                                </option>
                              ))}
                            </select>
                          </div>
                          {/* Street Address Input */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Street Address *</label>
                            <textarea
                              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
                              placeholder="e.g., 14, armanina street (10-220 characters)"
                              value={orderDetails.deliveryAddress || ""}
                              onChange={(e) => onUpdateOrderDetails({ deliveryAddress: e.target.value })}
                              rows={2}
                              minLength={10}
                              maxLength={220}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                            <select
                              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
                              value={orderDetails.pathaoRecipientCity || "none"}
                              onChange={async (e) => {
                                const cityId = e.target.value === "none" ? undefined : e.target.value;
                                onUpdateOrderDetails({ pathaoRecipientCity: cityId, pathaoRecipientZone: undefined });
                                if (cityId) {
                                  try {
                                    const zonesRes: any = await deliveryService.getPathaoZones(cityId);
                                    setPathaoZones(normalizeArray(zonesRes));
                                  } catch (err) {
                                    console.error("Failed to load zones", err);
                                  }
                                }
                              }}
                            >
                              <option value="none">{loadingPathaoData ? "Loading..." : "Select City"}</option>
                              {pathaoCities.map((c: any) => (
                                <option key={c.city_id || c.id} value={String(c.city_id || c.id)}>
                                  {c.city_name || c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Zone</label>
                            <select
                              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
                              value={orderDetails.pathaoRecipientZone || "none"}
                              onChange={async (e) => {
                                const zoneId = e.target.value === "none" ? undefined : e.target.value;
                                onUpdateOrderDetails({ pathaoRecipientZone: zoneId, pathaoRecipientArea: undefined });
                                setPathaoAreas([]);
                                if (zoneId) {
                                  try {
                                    const areasRes: any = await deliveryService.getPathaoAreas(zoneId);
                                    setPathaoAreas(normalizeArray(areasRes));
                                  } catch (err) {
                                    console.error("Failed to load areas", err);
                                  }
                                }
                              }}
                            >
                              <option value="none">Select Zone</option>
                              {pathaoZones.map((z: any) => (
                                <option key={z.zone_id || z.id} value={String(z.zone_id || z.id)}>
                                  {z.zone_name || z.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          {pathaoAreas.length > 0 && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Area</label>
                              <select
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
                                value={orderDetails.pathaoRecipientArea || "none"}
                                onChange={(e) => {
                                  const areaId = e.target.value === "none" ? undefined : e.target.value;
                                  onUpdateOrderDetails({ pathaoRecipientArea: areaId });
                                }}
                              >
                                <option value="none">Select Area</option>
                                {pathaoAreas.map((a: any) => (
                                  <option key={a.area_id || a.id} value={String(a.area_id || a.id)}>
                                    {a.area_name || a.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Item Weight (kg)</label>
                            <input
                              type="number"
                              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
                              value={orderDetails.pathaoItemWeight || ""}
                              onChange={(e) => onUpdateOrderDetails({ pathaoItemWeight: Number(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Item Type</label>
                            <select
                              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
                              value={"2"}
                              disabled
                            >
                              <option value="2">Parcel</option>
                            </select>
                          </div>
                          {/* <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Recipient Name *</label>
                            <input
                              className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter recipient name"
                              value={orderDetails.recipientName || orderDetails.customerName || ""}
                              onChange={(e) => onUpdateOrderDetails({ recipientName: e.target.value })}
                              readOnly={!!orderDetails.customerName}
                            />
                          </div> */}
                        </div>
                      </div>
                    )}

                    {/* Standard Delivery Address */}
                    {orderDetails.courierService !== "pathao" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Street Address *</label>
                          <textarea
                            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                            placeholder="Enter street address..."
                            value={orderDetails.deliveryAddress}
                            onChange={(e) => onUpdateOrderDetails({ deliveryAddress: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                            <input
                              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                              placeholder="City"
                              value={orderDetails.deliveryCity || ""}
                              onChange={(e) => onUpdateOrderDetails({ deliveryCity: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">State (optional)</label>
                            <input
                              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                              placeholder="State/Province (optional)"
                              value={orderDetails.deliveryState || ""}
                              onChange={(e) => onUpdateOrderDetails({ deliveryState: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Steadfast Options */}
                    {orderDetails.courierService === "steadfast" && (
                      <div className="space-y-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                        <h4 className="text-lg font-medium text-green-700 dark:text-green-300">Steadfast Courier Options</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Alternative Phone</label>
                            <input
                              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
                              placeholder="01XXXXXXXXX"
                              value={orderDetails.alternativePhone || ""}
                              onChange={(e) => onUpdateOrderDetails({ alternativePhone: e.target.value })}
                              maxLength={11}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Delivery Type</label>
                            <select
                              className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
                              value={orderDetails.steadfastDeliveryType || "0"}
                              onChange={(e) => onUpdateOrderDetails({ steadfastDeliveryType: Number(e.target.value) as 0 | 1 })}
                            >
                              <option value="0">🏠 Home Delivery</option>
                              <option value="1">📍 Hub Pickup</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Item Description</label>
                          <input
                            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
                            placeholder="Brief description of items..."
                            value={orderDetails.itemDescription || ""}
                            onChange={(e) => onUpdateOrderDetails({ itemDescription: e.target.value })}
                            maxLength={100}
                          />
                        </div>
                      </div>
                    )}

                    {/* Paperfly Options */}
                    {orderDetails.courierService === "paperfly" && (
                      <div className="space-y-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 rounded-lg">
                        <h4 className="text-lg font-medium text-orange-700 dark:text-orange-300">Paperfly Courier Options</h4>
                        <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg text-sm text-orange-800 dark:text-orange-300">
                          <strong>Note:</strong> Paperfly is a tracking-only service. You'll need to manually arrange shipment with Paperfly.
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Paperfly Order Number</label>
                          <input
                            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                            placeholder="Z-290625-43129-A3-A6"
                            value={orderDetails.paperflyOrderNumber || ""}
                            onChange={(e) => onUpdateOrderDetails({ paperflyOrderNumber: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    {/* Delivery Fee */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Delivery Fee</label>
                      <input
                        type="number"
                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                        value={orderDetails.deliveryFee || 0}
                        onChange={(e) => onUpdateOrderDetails({ deliveryFee: Number(e.target.value) || 0 })}
                        min="0"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="waive-delivery-fee"
                          checked={orderDetails.waiveDeliveryFee || false}
                          onChange={(e) => onUpdateOrderDetails({ waiveDeliveryFee: e.target.checked })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                        />
                        <label htmlFor="waive-delivery-fee" className="text-sm text-gray-700 dark:text-gray-300">Waive delivery fee</label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Payment Options */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Choose Payment Method</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {getAvailablePaymentMethods().map((method: any) => (
                      <button
                        key={method.id}
                        className={`p-4 rounded-lg border flex items-center gap-3 ${orderDetails.paymentMethod === method.id
                          ? "bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-500 dark:border-indigo-400 text-gray-900 dark:text-gray-100"
                          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
                          } transition-colors`}
                        onClick={() => handlePaymentMethodSelect(method.id)}
                      >
                        {method.icon}
                        <div className="text-left">
                          <div className="font-semibold text-lg">{method.label}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{method.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Payment Details */}
                  {requiresTransactionId && (
                    <div className="space-y-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 rounded-lg">
                      <h4 className="text-lg font-medium text-indigo-700 dark:text-indigo-300">Payment Details</h4>
                      {orderDetails.paymentMethod === "mobile" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mobile Banking Provider *</label>
                          <select
                            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                            value={orderDetails.mobileProvider || ""}
                            onChange={(e) => onUpdateOrderDetails({ mobileProvider: e.target.value as "bkash" | "nagad" | "rocket" | "upay" | "" })}
                          >
                            <option value="">Select Provider</option>
                            {["bkash", "nagad", "rocket", "upay"].map((provider) => (
                              <option key={provider} value={provider}>
                                {provider.charAt(0).toUpperCase() + provider.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {orderDetails.paymentMethod === "card" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Card Type *</label>
                          <select
                            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            value={orderDetails.cardType || ""}
                            onChange={(e) => onUpdateOrderDetails({ cardType: e.target.value as "visa" | "mastercard" | "amex" | "other" | "" })}
                          >
                            <option value="">Select Card Type</option>
                            {["visa", "mastercard", "amex", "other"].map((type) => (
                              <option key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Transaction ID *{" "}
                          {orderDetails.paymentMethod === "mobile" && orderDetails.mobileProvider && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({orderDetails.mobileProvider.charAt(0).toUpperCase() + orderDetails.mobileProvider.slice(1)} TxnID)
                            </span>
                          )}
                          {orderDetails.paymentMethod === "card" && orderDetails.cardType && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({orderDetails.cardType.charAt(0).toUpperCase() + orderDetails.cardType.slice(1)} Transaction ID)
                            </span>
                          )}
                        </label>
                        <input
                          className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 font-mono"
                          placeholder={
                            orderDetails.paymentMethod === "mobile"
                              ? `Enter ${orderDetails.mobileProvider || "mobile banking"} transaction ID`
                              : `Enter ${orderDetails.cardType || "card"} transaction ID`
                          }
                          value={orderDetails.transactionId || ""}
                          onChange={(e) => onUpdateOrderDetails({ transactionId: e.target.value })}
                        />
                      </div>
                      {orderDetails.transactionId && (
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900 dark:text-gray-100">Transaction Summary</div>
                            <div className="mt-1 space-y-1">
                              {orderDetails.paymentMethod === "mobile" && orderDetails.mobileProvider && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Provider:</span>
                                  <span className="capitalize text-gray-900 dark:text-gray-100">{orderDetails.mobileProvider}</span>
                                </div>
                              )}
                              {orderDetails.paymentMethod === "card" && orderDetails.cardType && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Card Type:</span>
                                  <span className="capitalize text-gray-900 dark:text-gray-100">{orderDetails.cardType}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Transaction ID:</span>
                                <span className="font-mono text-gray-900 dark:text-gray-100">{orderDetails.transactionId}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Summary */}
                  {!requiresTransactionId && orderDetails.paymentMethod && (
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {orderDetails.paymentMethod === "cash" && "Cash Payment"}
                          {orderDetails.paymentMethod === "cod" && "Cash on Delivery"}
                          {orderDetails.paymentMethod === "delivery_partner" && "Payment via Delivery Partner"}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 mt-1">
                          {orderDetails.paymentMethod === "cash" && "Payment collected at pickup/store"}
                          {orderDetails.paymentMethod === "cod" && (
                            <div className="space-y-1">
                              <div>
                                {orderDetails.paymentMethod === "cod" && (orderDetails.paidAmount ?? 0) > 0 && total > (orderDetails.paidAmount ?? 0)
                                  ? `৳${(total - (orderDetails.paidAmount ?? 0)).toLocaleString()} to be collected on delivery`
                                  : `৳${total.toLocaleString()} to be collected on delivery`}
                              </div>
                              {orderDetails.deliveryType === "delivery" && orderDetails.waiveDeliveryFee && (
                                <div className="text-xs text-green-600 dark:text-green-400">Delivery fee waived</div>
                              )}
                              {orderDetails.deliveryType === "delivery" && !orderDetails.waiveDeliveryFee && (orderDetails.deliveryFee ?? 0) > 0 && (
                                <div className="text-xs">Includes ৳{orderDetails.deliveryFee ?? 0} delivery fee</div>
                              )}
                              {orderDetails.courierService && (
                                <div className="text-xs">
                                  Delivered by {orderDetails.courierService.charAt(0).toUpperCase() + orderDetails.courierService.slice(1)} Courier
                                </div>
                              )}
                            </div>
                          )}
                          {orderDetails.paymentMethod === "delivery_partner" && "Payment handled by delivery service"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              {currentStep > 1 && (
                <button
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Back
                </button>
              )}
              <button
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-400 transition-colors disabled:opacity-50"
                onClick={handleNextStep}
                disabled={currentStep === 3 && !isFormValid()}
              >
                {currentStep === 3 ? "Confirm & Save" : "Next"}
                <ArrowRight className="ml-2 w-4 h-4 inline" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeliveryOptions;