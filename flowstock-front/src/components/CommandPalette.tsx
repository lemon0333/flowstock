/**
 * 글로벌 검색 (Cmd+K / Ctrl+K) — 학습 토픽 + 페이지 + 종목 한 번에.
 * Header 트리거 또는 단축키로 호출.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { LEARN_TOPICS } from "@/lib/learn-content";
import { NAV_GROUPS } from "@/components/layout/nav-config";
import { stockApi } from "@/services/api";

interface StockHit {
  id: string;
  name: string;
  ticker?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<StockHit[]>([]);
  const [query, setQuery] = useState("");

  // 종목 데이터 lazy fetch — 처음 열릴 때만
  useEffect(() => {
    if (!open || stocks.length > 0) return;
    stockApi
      .getMarket()
      .then((res) => {
        const list = (res?.data ?? []) as Array<Record<string, unknown>>;
        setStocks(
          list
            .map((s) => ({
              id: String(s.id ?? s.ticker ?? ""),
              name: String(s.name ?? ""),
              ticker: s.ticker ? String(s.ticker) : undefined,
            }))
            .filter((s) => s.id && s.name),
        );
      })
      .catch(() => {
        // 비로그인이면 401 — 그땐 종목 검색 비활성, 페이지/토픽만
      });
  }, [open, stocks.length]);

  const go = (path: string) => {
    onOpenChange(false);
    setQuery("");
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="종목·학습 토픽·페이지 검색…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>일치하는 결과 없음</CommandEmpty>

        <CommandGroup heading="📚 학습 토픽">
          {LEARN_TOPICS.filter((t) => t.status === "ready")
            .slice(0, 30)
            .map((t) => (
              <CommandItem
                key={t.slug}
                value={`${t.title} ${t.oneLiner} ${t.slug}`}
                onSelect={() => go(`/learn/${t.slug}`)}
              >
                <span className="mr-2">{t.emoji}</span>
                <span className="flex-1">{t.title}</span>
                <span className="text-[10px] text-muted-foreground ml-2">
                  {t.oneLiner.slice(0, 30)}
                </span>
              </CommandItem>
            ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="🧭 페이지">
          {NAV_GROUPS.flatMap((g) =>
            g.items.map((it) => (
              <CommandItem
                key={it.path}
                value={`${g.label} ${it.label}`}
                onSelect={() => go(it.path)}
              >
                <it.icon className="mr-2 h-4 w-4 opacity-70" />
                <span className="flex-1">{it.label}</span>
                <span className="text-[10px] text-muted-foreground ml-2">{g.label}</span>
              </CommandItem>
            )),
          )}
        </CommandGroup>

        {stocks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="📈 종목">
              {stocks.slice(0, 50).map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.name} ${s.ticker ?? ""}`}
                  onSelect={() => go(`/stock/${s.id}`)}
                >
                  <span className="flex-1">{s.name}</span>
                  {s.ticker && (
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {s.ticker}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
