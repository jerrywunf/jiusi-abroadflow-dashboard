"use client";

import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, BarChart3, BookOpen, CalendarDays, CheckCircle2,
  FileCheck2, GraduationCap, LayoutDashboard, Lightbulb, Sparkles, Star,
  Target, TriangleAlert, Users
} from "lucide-react";
import { useStudents } from "@/components/student-provider";
import { studentTarget } from "@/lib/students";

const nav = [
  [LayoutDashboard, "工作台"], [Users, "学生管理"], [FileCheck2, "申请管理"],
  [BookOpen, "院校库"], [Sparkles, "AI 规划助手"], [BarChart3, "月度报告"],
  [TriangleAlert, "风险提示"]
] as const;

const risks = [
  { risk: "活动经历不足", advice: "在 8 月内补充一项与目标专业相关的实践项目，并沉淀可量化成果。" },
  { risk: "文书准备较晚", advice: "本周启动素材梳理，9 月完成个人陈述初稿并进入反馈修改。" }
];

const plan = [
  { month: "8月", title: "背景补充与定位", tasks: ["完成目标专业活动补充", "梳理个人经历与申请素材", "确认最终选校范围"] },
  { month: "9月", title: "文书与材料准备", tasks: ["完成个人陈述初稿", "联系推荐人并准备推荐信", "整理成绩单与证明材料"] },
  { month: "10月", title: "申请完善与提交", tasks: ["完成文书多轮修改", "核对网申信息和材料", "提交首批目标院校申请"] }
];

export default function StudentReportPage({ params }: { params: { id: string } }) {
  const { students, hydrated } = useStudents();
  const student = students.find((item) => item.id === params.id);
  if (!hydrated) return <div className="grid min-h-screen place-items-center bg-[#f7f9f8] text-sm text-slate-400">正在生成规划报告...</div>;
  if (!student) return <div className="grid min-h-screen place-items-center bg-[#f7f9f8] px-4 text-center"><div><p className="text-lg font-semibold">未找到该学生</p><Link href="/" className="mt-5 inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-medium text-white">返回学生列表</Link></div></div>;
  const target = studentTarget(student);
  const summary = `${student.name}的目标方向为${target}，当前 GPA 为${student.gpa || "待完善"}，${student.languageTest.type || "语言考试"}成绩为${student.languageTest.score || "待补充"}。该学生整体规划方向清晰，目前短板主要集中在活动经历的深度以及文书启动时间。建议未来 90 天优先补充与目标专业相关的实践成果，并尽快进入文书素材梳理阶段，以形成更完整且有辨识度的申请故事。`;

  return <div className="min-h-screen bg-[#f7f9f8]">
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 lg:block">
      <div className="flex items-center gap-3 px-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white"><GraduationCap size={20}/></span><div><p className="font-semibold tracking-tight">玖肆留学</p><p className="text-[11px] text-slate-400">Jiusi Education</p></div></div>
      <nav className="mt-9 space-y-1">{nav.map(([Icon, label]) => <Link key={label} href={label === "学生管理" ? "/" : "#"} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${label === "AI 规划助手" ? "bg-brand-50 font-medium text-brand-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}><Icon size={18}/>{label}</Link>)}</nav>
    </aside>

    <main className="lg:pl-64">
      <header className="flex h-16 items-center border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8"><span className="text-sm text-slate-400">学生管理</span><span className="mx-3 text-slate-300">/</span><span className="text-sm text-slate-400">{student.name}</span><span className="mx-3 text-slate-300">/</span><span className="text-sm font-medium">AI 规划报告</span></header>

      <div className="mx-auto max-w-[1300px] p-4 md:p-8">
        <Link href={`/students/${params.id}`} className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-brand-700"><ArrowLeft size={16}/>返回学生详情</Link>
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:p-7">
          <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Sparkles size={22}/></span><div><p className="text-sm font-medium text-brand-600">AI GENERATED REPORT</p><h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">AI 规划报告</h1><p className="mt-2 text-sm text-slate-500">{student.name} · 基于当前学生档案生成的模拟规划分析</p></div></div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card title="学生画像" icon={Target}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Profile label="目标方向" value={target}/><Profile label="GPA" value={student.gpa || "暂无"}/><Profile label={student.languageTest.type || "语言成绩"} value={student.languageTest.score || "暂无"}/><Profile label="SAT" value={student.sat || "暂无"}/></div>
            </Card>

            <Card title="竞争力分析" icon={BarChart3}>
              <div className="grid gap-4 sm:grid-cols-3"><Rating label="学术能力" score={5} note="成绩稳定，基础扎实"/><Rating label="语言能力" score={4} note="达到多数项目要求"/><Rating label="活动背景" score={3} note="仍有较大提升空间"/></div>
            </Card>

            <Card title="未来 90 天规划" icon={CalendarDays}>
              <div className="relative space-y-6 before:absolute before:bottom-4 before:left-5 before:top-5 before:w-px before:bg-slate-200">{plan.map((item, index) => <div key={item.month} className="relative flex gap-4"><span className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold ${index === 0 ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-slate-500"}`}>{item.month}</span><div className="flex-1 rounded-xl border border-slate-100 bg-slate-50/60 p-4"><p className="font-medium text-slate-700">{item.title}</p><ul className="mt-3 grid gap-2 sm:grid-cols-2">{item.tasks.map((task) => <li key={task} className="flex gap-2 text-sm text-slate-500"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-brand-500"/>{task}</li>)}</ul></div></div>)}</div>
            </Card>

            <Card title="AI 总结" icon={Sparkles}>
              <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-5"><p className="text-sm leading-7 text-slate-600">{summary}</p></div>
            </Card>
          </div>

          <div>
            <Card title="申请风险分析" icon={AlertTriangle}>
              <div className="space-y-4">{risks.map((item) => <div key={item.risk} className="overflow-hidden rounded-xl border border-slate-100"><div className="flex items-center gap-2 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"><AlertTriangle size={16}/>{item.risk}</div><div className="flex gap-2 px-4 py-4 text-sm leading-6 text-slate-500"><Lightbulb size={16} className="mt-1 shrink-0 text-amber-500"/><div><p className="text-xs font-medium text-slate-400">对应建议</p><p className="mt-1">{item.advice}</p></div></div></div>)}</div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  </div>;
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:p-6"><div className="mb-5 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon size={17}/></span><h2 className="font-semibold">{title}</h2></div>{children}</section>;
}

function Profile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 font-semibold text-slate-700">{value}</p></div>;
}

function Rating({ label, score, note }: { label: string; score: number; note: string }) {
  return <div className="rounded-xl border border-slate-100 p-4"><p className="text-sm font-medium text-slate-700">{label}</p><div className="mt-3 flex gap-1" aria-label={`${label} ${score} 星`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={18} className={index < score ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-200"}/>)}</div><p className="mt-3 text-xs text-slate-400">{note}</p></div>;
}
