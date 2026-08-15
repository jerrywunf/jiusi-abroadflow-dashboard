"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle, ArrowLeft, BarChart3, BookOpen, CalendarDays, CheckCircle2,
  ClipboardCheck, FileCheck2, GraduationCap, LayoutDashboard, RefreshCw,
  Sparkles, Star, Target, TriangleAlert, Users,
} from "lucide-react";
import { useStudents } from "@/components/student-provider";
import { Student } from "@/lib/students";

type Dimension = { rating: number; analysis: string };
type PlanningReport = {
  title: string;
  studentProfile: {
    gpa: string;
    majorDirection: string;
    languageScore: string;
    standardizedTest: string;
  };
  analysisBasis: {
    factsSummary: string;
    assessmentSummary: string;
    advisorAttention: string;
  };
  competitiveness: {
    hardSkills: Dimension;
    softSkills: Dimension;
    peerComparison: string;
  };
  risks: Array<{ risk: string; severity: "高" | "中" | "低"; reason: string }>;
  urgentTasks: Array<{ task: string; priority: "高" | "中" | "低"; action: string }>;
  timeline90Days: Array<{ period: string; objective: string; actions: string[] }>;
  schoolStrategy: Array<{ tier: "冲刺" | "匹配" | "稳妥"; rationale: string; examples: string[] }>;
  conclusion: string;
};

type ApiResponse = { success: true; report: PlanningReport; responseId: string };

const reportRequests = new Map<string, Promise<ApiResponse>>();
const nav = [
  [LayoutDashboard, "工作台"], [Users, "学生管理"], [FileCheck2, "申请管理"],
  [BookOpen, "院校库"], [Sparkles, "AI 规划助手"], [BarChart3, "月度报告"],
  [TriangleAlert, "风险提示"],
] as const;

function requestReport(student: Student, force = false) {
  if (force) reportRequests.delete(student.id);
  const existing = reportRequests.get(student.id);
  if (existing) return existing;

  const request = fetch("/api/generate-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: student.id,
      student,
      forceRegenerate: force,
    }),
  }).then(async (response) => {
    const data = await response.json() as ApiResponse | { error?: string; details?: string };
    if (!response.ok || !("success" in data)) {
      const apiError = "error" in data
        ? [data.error, data.details].filter(Boolean).join("：")
        : undefined;
      throw new Error(apiError || "生成报告失败，请稍后重试");
    }
    return data;
  }).catch((error) => {
    reportRequests.delete(student.id);
    throw error;
  });

  reportRequests.set(student.id, request);
  return request;
}

export default function StudentReportPage({ params }: { params: { id: string } }) {
  const { students, hydrated } = useStudents();
  const student = students.find((item) => item.id === params.id);
  const [report, setReport] = useState<PlanningReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function generate(force = false) {
    if (!student) return;
    setLoading(true);
    setError("");
    if (force) setReport(null);
    void requestReport(student, force)
      .then((data) => setReport(data.report))
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "生成报告失败，请稍后重试"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (hydrated && student && !report && !loading && !error) generate();
    // The request cache prevents duplicate API calls in React development mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, student?.id]);

  if (!hydrated) return <StatusPage text="正在读取学生档案…"/>;
  if (!student) return <StatusPage text="未找到该学生" backHref="/"/>;

  return <div className="min-h-screen bg-[#f7f9f8]">
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 lg:block">
      <div className="flex items-center gap-3 px-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white"><GraduationCap size={20}/></span><div><p className="font-semibold tracking-tight">玖肆留学</p><p className="text-[11px] text-slate-400">Jiusi Education</p></div></div>
      <nav className="mt-9 space-y-1">{nav.map(([Icon, label]) => <Link key={label} href={label === "学生管理" ? "/" : "#"} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${label === "AI 规划助手" ? "bg-brand-50 font-medium text-brand-700" : "text-slate-500 hover:bg-slate-50"}`}><Icon size={18}/>{label}</Link>)}</nav>
    </aside>

    <main className="lg:pl-64">
      <header className="flex h-16 items-center border-b border-slate-200 bg-white/90 px-4 md:px-8"><span className="text-sm text-slate-400">学生管理</span><span className="mx-3 text-slate-300">/</span><span className="text-sm text-slate-400">{student.name}</span><span className="mx-3 text-slate-300">/</span><span className="text-sm font-medium">AI 规划报告</span></header>
      <div className="mx-auto max-w-[1300px] p-4 md:p-8">
        <Link href={`/students/${params.id}`} className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-brand-700"><ArrowLeft size={16}/>返回学生详情</Link>
        <section className="mt-5 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between md:p-7">
          <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Sparkles size={22}/></span><div><p className="text-sm font-medium text-brand-600">QWEN GENERATED REPORT</p><h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{report?.title || "AI 规划报告"}</h1><p className="mt-2 text-sm text-slate-500">{student.name} · 基于当前学生档案实时生成</p></div></div>
          {report && <button onClick={() => generate(true)} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={15}/>重新生成</button>}
        </section>

        {loading && <LoadingReport/>}
        {error && <ErrorReport message={error} onRetry={() => generate(true)}/>} 
        {report && <ReportContent report={report}/>} 
      </div>
    </main>
  </div>;
}

function ReportContent({ report }: { report: PlanningReport }) {
  const runtimeReport = report as Partial<PlanningReport>;
  const profile = runtimeReport.studentProfile ?? { gpa: "暂无", majorDirection: "暂无", languageScore: "暂无", standardizedTest: "暂无" };
  const analysisBasis = runtimeReport.analysisBasis ?? { factsSummary: "暂无", assessmentSummary: "暂无", advisorAttention: "暂无" };
  const competitiveness = runtimeReport.competitiveness ?? {
    hardSkills: { rating: 1, analysis: "暂无" },
    softSkills: { rating: 1, analysis: "暂无" },
    peerComparison: "暂无",
  };
  const timeline90Days = Array.isArray(runtimeReport.timeline90Days) ? runtimeReport.timeline90Days : [];
  const schoolStrategy = Array.isArray(runtimeReport.schoolStrategy) ? runtimeReport.schoolStrategy : [];
  const risks = Array.isArray(runtimeReport.risks) ? runtimeReport.risks : [];
  const urgentTasks = Array.isArray(runtimeReport.urgentTasks) ? runtimeReport.urgentTasks : [];

  return <div className="mt-6 grid gap-6 xl:grid-cols-3">
    <div className="space-y-6 xl:col-span-2">
      <Card title="学生画像" icon={Target}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Profile label="GPA" value={profile.gpa}/><Profile label="专业方向" value={profile.majorDirection}/><Profile label="语言成绩" value={profile.languageScore}/><Profile label="标化成绩" value={profile.standardizedTest}/></div></Card>
      <Card title="分析依据" icon={ClipboardCheck}><div className="grid gap-4 md:grid-cols-3"><BasisSummary title="确定事实" content={analysisBasis.factsSummary} tone="fact"/><BasisSummary title="专业判断" content={analysisBasis.assessmentSummary} tone="judgment"/><BasisSummary title="顾问关注" content={analysisBasis.advisorAttention} tone="confirm"/></div></Card>
      <Card title="竞争力分析" icon={BarChart3}><div className="grid gap-4 md:grid-cols-2"><Rating label="硬实力分析" value={competitiveness.hardSkills}/><Rating label="软实力分析" value={competitiveness.softSkills}/></div><div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4"><p className="text-xs font-medium text-slate-400">同期申请者竞争力比较</p><p className="mt-2 text-sm leading-6 text-slate-600">{competitiveness.peerComparison}</p></div></Card>
      <Card title="未来 90 天规划" icon={CalendarDays}><div className="relative space-y-5 before:absolute before:bottom-4 before:left-5 before:top-5 before:w-px before:bg-slate-200">{timeline90Days.map((item, index) => <div key={`${item.period}-${index}`} className="relative flex gap-4"><span className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${index === 0 ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-slate-500"}`}>{index + 1}</span><div className="flex-1 rounded-xl border border-slate-100 bg-slate-50/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-slate-700">{item.objective}</p><span className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-500">{item.period}</span></div><ul className="mt-3 grid gap-2 sm:grid-cols-2">{(Array.isArray(item.actions) ? item.actions : []).map((action) => <li key={action} className="flex gap-2 text-sm leading-6 text-slate-500"><CheckCircle2 size={15} className="mt-1 shrink-0 text-brand-500"/>{action}</li>)}</ul></div></div>)}</div></Card>
      <Card title="目标院校分析" icon={GraduationCap}><div className="grid gap-4 md:grid-cols-3">{schoolStrategy.map((item, index) => <div key={`${item.tier}-${index}`} className="rounded-xl border border-slate-100 p-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tierStyle[item.tier]}`}>{item.tier}</span><p className="mt-3 text-sm leading-6 text-slate-600">{item.rationale}</p><div className="mt-3 flex flex-wrap gap-2">{(Array.isArray(item.examples) ? item.examples : []).map((school) => <span key={school} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500">{school}</span>)}</div></div>)}</div></Card>
      <Card title="总结建议" icon={Sparkles}><div className="rounded-xl border border-brand-100 bg-brand-50/60 p-5"><p className="text-sm leading-7 text-slate-600">{runtimeReport.conclusion || "暂无"}</p></div></Card>
    </div>

    <div className="space-y-6">
      <Card title="申请风险" icon={AlertTriangle}><div className="space-y-3">{risks.map((item, index) => <div key={`${item.risk}-${index}`} className="overflow-hidden rounded-xl border border-slate-100"><div className="flex items-center justify-between gap-2 bg-rose-50 px-4 py-3"><span className="flex items-center gap-2 text-sm font-medium text-rose-700"><AlertTriangle size={15}/>{item.risk}</span><Badge value={item.severity}/></div><p className="px-4 py-3 text-sm leading-6 text-slate-500">{item.reason}</p></div>)}</div></Card>
      <Card title="当前紧急任务" icon={ClipboardCheck}><div className="space-y-3">{urgentTasks.map((item, index) => <div key={`${item.task}-${index}`} className="rounded-xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-slate-700">{item.task}</p><Badge value={item.priority}/></div><p className="mt-2 text-sm leading-6 text-slate-500">{item.action}</p></div>)}</div></Card>
    </div>
  </div>;
}

const tierStyle = { 冲刺: "bg-rose-50 text-rose-600", 匹配: "bg-blue-50 text-blue-600", 稳妥: "bg-emerald-50 text-emerald-600" };
const priorityStyle = { 高: "bg-rose-100 text-rose-700", 中: "bg-amber-100 text-amber-700", 低: "bg-emerald-100 text-emerald-700" };

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:p-6"><div className="mb-5 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon size={17}/></span><h2 className="font-semibold">{title}</h2></div>{children}</section>; }
function Profile({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 font-semibold text-slate-700">{value || "暂无"}</p></div>; }
function Rating({ label, value }: { label: string; value: Dimension }) { return <div className="rounded-xl border border-slate-100 p-4"><p className="text-sm font-medium text-slate-700">{label}</p><div className="mt-3 flex gap-1" aria-label={`${label} ${value.rating} 星`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={17} className={index < value.rating ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-200"}/>)}</div><p className="mt-3 text-sm leading-6 text-slate-500">{value.analysis}</p></div>; }
function Badge({ value }: { value: "高" | "中" | "低" }) { return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityStyle[value]}`}>{value}</span>; }
function BasisSummary({ title, content, tone }: { title: string; content: string; tone: "fact" | "judgment" | "confirm" }) {
  const styles = { fact: "bg-emerald-50 text-emerald-700", judgment: "bg-blue-50 text-blue-700", confirm: "bg-amber-50 text-amber-700" };
  return <div className="rounded-xl border border-slate-100 p-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[tone]}`}>{title}</span><p className="mt-3 text-sm leading-6 text-slate-600">{content || "暂无"}</p></div>;
}
function LoadingReport() { return <section className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center shadow-card"><span className="mx-auto grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-brand-50 text-brand-600"><Sparkles size={22}/></span><h2 className="mt-4 font-semibold">千问正在生成规划报告</h2><p className="mt-2 text-sm text-slate-400">正在综合分析学生档案、竞争力、风险和未来90天任务，请耐心等待。</p><div className="mx-auto mt-6 h-1.5 max-w-xs overflow-hidden rounded-full bg-slate-100"><div className="h-full w-2/3 animate-pulse rounded-full bg-brand-500"/></div></section>; }
function ErrorReport({ message, onRetry }: { message: string; onRetry: () => void }) { return <section className="mt-6 rounded-2xl border border-rose-200 bg-white px-6 py-14 text-center shadow-card"><AlertTriangle size={28} className="mx-auto text-rose-500"/><h2 className="mt-3 font-semibold">报告生成失败</h2><p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{message}</p><button onClick={onRetry} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"><RefreshCw size={15}/>重新生成</button></section>; }
function StatusPage({ text, backHref }: { text: string; backHref?: string }) { return <div className="grid min-h-screen place-items-center bg-[#f7f9f8] px-4 text-center"><div><p className="font-medium text-slate-600">{text}</p>{backHref && <Link href={backHref} className="mt-5 inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-medium text-white">返回学生列表</Link>}</div></div>; }
