import { Card } from "@heroui/react";
import { SectionHeading, SiteShell } from "@/components/site-shell";

const principles = [
  "先给观影判断，再展示资料。",
  "只展示正版观看路径、官方发行信息和合法资料来源。",
  "高清参数必须转化为用户能理解的设备与场景建议。",
  "会员价值来自节省时间、版本追踪和私人片库管理，而不是资源链接。",
];

export default function AboutPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <SectionHeading eyebrow="About" title="关于零号站" description="Station Zero 是一个高清观影决策系统，不是影视资源下载站。" />
        <div className="grid gap-5 md:grid-cols-2">
          {principles.map((principle) => (
            <Card key={principle} className="rounded-3xl border border-[color:var(--sz-border)] bg-[var(--sz-card)] p-6 text-xl leading-9 text-[var(--sz-text-soft)]">
              {principle}
            </Card>
          ))}
        </div>
        <Card className="mt-8 rounded-3xl border border-[color:var(--sz-accent-soft)] bg-[var(--sz-accent-faint)] p-6 leading-8 text-[var(--sz-text-soft)]">
          合规边界：公开产品不提供磁力、BT、网盘、迅雷、盗版资源站或侵权下载入口。Station Zero 的价值来自专业判断、信息组织、审美策展和合法观看导航。
        </Card>
      </section>
    </SiteShell>
  );
}
