"use client";

import { useEffect, useState } from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, SITE_URL } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import type { ShopPublic } from "@/lib/types";

export function ShopActions({ shopId, contactNumber, shopName }: { shopId: number; contactNumber: string; shopName: string }) {
  const { user, requireAuth } = useAuth();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .get<ShopPublic[]>("/api/me/following")
      .then((shops) => setFollowing(shops.some((s) => s.id === shopId)))
      .catch(() => {});
  }, [user, shopId]);

  async function toggleFollow() {
    setBusy(true);
    try {
      await requireAuth();
      const result = await api.post<{ following: boolean }>(`/api/shops/${shopId}/follow`);
      setFollowing(result.following);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = `${SITE_URL}/shops/${shopId}`;
    if (navigator.share) {
      await navigator.share({ title: shopName, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied");
    }
  }

  const waLink = `https://wa.me/91${contactNumber}?text=${encodeURIComponent(`Hi, I saw ${shopName} on Hylo Hub — is this available?`)}`;

  return (
    <div className="flex gap-2">
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1fb855]"
      >
        <MessageCircle size={17} /> Ask on WhatsApp
      </a>
      <Button variant="outline" onClick={toggleFollow} disabled={busy} className="border-border text-foreground/70">
        <Heart size={16} className={following ? "fill-brand text-brand" : ""} />
        {following ? "Following" : "Follow"}
      </Button>
      <Button variant="outline" onClick={share} className="border-border px-3 text-foreground/70">
        <Share2 size={16} />
      </Button>
    </div>
  );
}
