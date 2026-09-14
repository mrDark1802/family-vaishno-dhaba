"use client";

import React, { useState } from "react";
import { ADMIN_REVIEWS } from "../../data/admin-mock";
import { Star, CheckCircle2, ShieldCheck, ThumbsUp } from "lucide-react";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState(ADMIN_REVIEWS);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">
            Customer Reviews & Ratings
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Feedback on food taste, packaging, and delivery experience.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900">
          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
          <span>Average Rating: 4.9 / 5.0</span>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-sm text-stone-900 block">
                  {rev.customerName}
                </span>
                <span className="text-xs text-stone-400">
                  Dish: <strong className="text-stone-700">{rev.dish}</strong> •{" "}
                  {rev.date}
                </span>
              </div>
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: rev.rating }).map((_, idx) => (
                  <Star key={idx} className="w-4 h-4 fill-amber-500" />
                ))}
              </div>
            </div>

            <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
              &ldquo;{rev.comment}&rdquo;
            </p>

            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified Customer Order
              </span>
              <span className="text-stone-400">Published on Web Menu</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
