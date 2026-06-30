import Link from "next/link";
import { knowledgeEntries } from "@/lib/content";
import { navItems } from "@/lib/nav-items";

/** 页脚片单摘要：浓缩策展方向，完整片单见 `/collections`。 */
const curationHints = [
  { label: "夜观", note: "暗部与霓虹控制强，适合关灯大屏。" },
  { label: "修复版", note: "胶片质感与色彩校准，重发行不重分辨率数字。" },
  { label: "音响", note: "用声音设计验设备，不只看爆炸场面。" },
] as const;

const footerLinkClass =
  "text-[var(--sz-muted)] transition-colors duration-200 ease-out motion-reduce:transition-none hover:text-[var(--sz-accent)] focus-visible:outline-none focus-visible:text-[var(--sz-accent)]";

type FooterReferenceProps = {
  id: string;
  title: string;
  href: string;
  linkLabel: string;
  items: readonly { label: string; note: string }[];
};

/** 页脚参考区：片单 / 知识等并列摘要块。 */
function FooterReference({
  id,
  title,
  href,
  linkLabel,
  items,
}: FooterReferenceProps) {
  return (
    <section aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-sm font-medium text-[var(--sz-text)]">
          {title}
        </h2>
        <Link href={href} className={`shrink-0 text-xs ${footerLinkClass}`}>
          {linkLabel}
        </Link>
      </div>
      <dl className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-xs font-medium text-[var(--sz-text-soft)]">
              {item.label}
            </dt>
            <dd className="mt-1 text-pretty text-xs leading-5 text-[var(--sz-muted)]">
              {item.note}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * 站点页脚：品牌与导航、片单/知识参考、合规声明。
 */
export function SiteFooter() {
  const knowledgeItems = knowledgeEntries.map((entry) => ({
    label: entry.term,
    note: entry.summary,
  }));

  return (
    <footer className="relative z-10 mx-auto max-w-7xl px-6 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] md:px-10">
      <div className="border-t border-[color:var(--sz-border)] pt-10 md:pt-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="shrink-0">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--sz-accent)]">
              Station Zero
            </p>
            <p className="mt-1 text-xs text-[var(--sz-muted)]">零号站</p>
          </div>

          <nav
            aria-label="页脚导航"
            className="flex flex-wrap gap-x-5 gap-y-2 text-sm md:justify-end"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={footerLinkClass}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 grid gap-10 md:mt-12 md:grid-cols-2 md:gap-12 lg:gap-16">
          <FooterReference
            id="footer-curation"
            title="片单"
            href="/collections"
            linkLabel="全部片单"
            items={curationHints}
          />
          <FooterReference
            id="footer-knowledge"
            title="高清知识"
            href="/knowledge"
            linkLabel="知识库"
            items={knowledgeItems}
          />
        </div>

        <p className="mt-10 border-t border-[color:var(--sz-border)] pt-6 text-pretty text-xs leading-6 text-[var(--sz-subtle)] md:mt-12">
          Station Zero
          在其服务器上不托管任何文件。所有种子文件和磁力链接均由用户提供，并自动从
          DHT 网络和追踪器中索引。我们不存储、上传或分发任何受版权保护的内容。
        </p>
      </div>
    </footer>
  );
}
